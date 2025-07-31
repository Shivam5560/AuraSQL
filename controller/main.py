# main.py

import sys
import os
import json
import logging
import asyncio
from contextlib import asynccontextmanager
from functools import partial

# FastAPI and related imports
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path to allow imports from 'scratch'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Your application's modules
from rag.QueryEngine import insert_schema, generate_query_engine
from db.extract_schema import ExtractSchema
from utils.system_prompt import system_prompt
from models.recommendations import recommendations

# Imports for client initialization
from dotenv import load_dotenv
from controller.clients import (
    get_pinecone_index,
    get_llm,
    get_embed_model_doc,
    get_embed_model_query,
)

# --- 1. INITIAL SETUP & LIFECYCLE MANAGEMENT ---

load_dotenv()
logging.basicConfig(level=logging.INFO)

# A dictionary to hold all initialized clients and caches.
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    This function runs once when the application starts.
    It initializes all heavyweight clients and stores them in app_state.
    """
    logging.info("Application starting up...")
    
    # Initialize all clients
    app_state["pinecone_index"] = get_pinecone_index()
    app_state["llm"] = get_llm()
    app_state["embed_model_doc"] = get_embed_model_doc()
    app_state["embed_model_query"] = get_embed_model_query()
    app_state["query_engine_cache"] = {}
    
    logging.info("All clients initialized successfully.")
    
    yield  # The application is now running

    logging.info("Application shutting down...")
    app_state.clear()


from utils.config import CORS_ALLOWED_ORIGINS, TIMEOUT_SECONDS

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



import uuid

# --- 2. API ENDPOINTS ---

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {"message": "Text-to-SQL Server is running! 🚀"}

# This endpoint is restored to its original implementation
@app.post("/connect")
async def extract_schema_api(request: Request):
    """Extract database schema information"""
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting schema extraction.")
    try:
        config = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        schema_extractor = ExtractSchema(
            db_type=config['db_type'],
            ip=config.get('ip'),
            port=config.get('port'),
            username=config.get('username'),
            password=config.get('password'),
            database=config.get('database'),
            schema_name=config.get('schema_name'),
            table_name=config['table_name']
        )
        schema_details = await schema_extractor.extract_schema_details()

        logger.info(f"Request {request_id}: Schema extraction successful.")
        return {
            "success": True,
            "schema": schema_details,
        }
    except asyncio.TimeoutError:
        logger.error(f"Request {request_id}: Timeout in /extract-schema")
        raise HTTPException(status_code=504, detail="Schema extraction timed out.")
    except ValueError as e:
        logger.error(f"Request {request_id}: Invalid database type provided: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Request {request_id}: Schema extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"Schema extraction failed: {str(e)}")

# This endpoint is OPTIMIZED
@app.post("/insert_schema")
async def insert_schema_api(request: Request):
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting schema insertion.")
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        
        result = insert_schema(
            schema_json=data.get("schema_details"),
            db_type=data.get("db_type"),
            schema_name=data.get("schema_name"),
            table_name=data.get("table_name"),
            pinecone_index=app_state["pinecone_index"],
            embed_model_doc=app_state["embed_model_doc"],
            query_engine_cache=app_state["query_engine_cache"]
        )

        if result:
            logger.info(f"Request {request_id}: Schema insertion successful.")
            return {"success": True, "message": "Schema inserted successfully."}
        else:
            logger.error(f"Request {request_id}: Failed to insert schema.")
            raise HTTPException(status_code=500, detail="Failed to insert schema.")
            
    except asyncio.TimeoutError:
        logger.error(f"Request {request_id}: Timeout in /insert_schema")
        raise HTTPException(status_code=504, detail="Schema insert timed out.")
    except Exception as e:
        logger.error(f"Request {request_id}: Error inserting schema: {e}")
        raise HTTPException(status_code=500, detail=f"Error inserting schema: {str(e)}")

@app.post("/query")
async def query_api(request: Request):
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting query generation.")
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        user_query = data.get("query")
        if not user_query:
            raise HTTPException(status_code=400, detail="User query cannot be empty.")
            
        formatted_query = f"{system_prompt}\nUser Query:\n{user_query}\nTable Name: {data.get('table_name')}\nDb Type: {data.get('db_type')}\n"

        sql_query_json = await generate_query_engine(
            user_query=formatted_query,
            db_type=data.get("db_type"),
            schema_name=data.get("schema_name"),
            table_name=data.get("table_name"),
            pinecone_index=app_state["pinecone_index"],
            llm=app_state["llm"],
            embed_model_query=app_state["embed_model_query"],
            query_engine_cache=app_state["query_engine_cache"]
        )

        if sql_query_json:
            sql_query = json.loads(sql_query_json)
            logger.info(f"Request {request_id}: Query generation successful.")
            return {"success": True, "sql": sql_query.get("sql", "")}
        else:
            logger.error(f"Request {request_id}: Failed to generate SQL query.")
            raise HTTPException(status_code=500, detail="Failed to generate SQL query.")
            
    except asyncio.TimeoutError:
        logger.error(f"Request {request_id}: Timeout in /query")
        raise HTTPException(status_code=504, detail="SQL generation timed out.")
    except json.JSONDecodeError as e:
        logger.error(f"Request {request_id}: Failed to decode JSON response: {e}")
        raise HTTPException(status_code=500, detail="Failed to decode JSON response from the query engine.")
    except Exception as e:
        logger.error(f"Request {request_id}: Error generating SQL query: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating SQL query: {str(e)}")

@app.post("/recommendations")
async def recommendations_api(request: Request):
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting recommendations generation.")
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)

        response = await recommendations(
            db_type=data.get("db_type"),
            schema_name=data.get("schema_name"),
            table_name=data.get("table_name"),
            pinecone_index=app_state["pinecone_index"],
            llm=app_state["llm"],
            embed_model_query=app_state["embed_model_query"],
            query_engine_cache=app_state["query_engine_cache"]
        )
        
        if response:
            logger.info(f"Request {request_id}: Recommendations generation successful.")
            return {"success": True, "recommendations": response.get("recommendations", [])}
        else:
            logger.error(f"Request {request_id}: Failed to generate recommendations.")
            raise HTTPException(status_code=500, detail="Failed to generate recommendations.")

    except asyncio.TimeoutError:
        logger.error(f"Request {request_id}: Timeout in /recommendations")
        raise HTTPException(status_code=504, detail="Recommendations timed out.")
    except json.JSONDecodeError as e:
        logger.error(f"Request {request_id}: Failed to decode JSON response: {e}")
        raise HTTPException(status_code=500, detail="Failed to decode JSON response from the query engine.")
    except Exception as e:
        logger.error(f"Request {request_id}: Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

# This endpoint is restored to its original implementation
@app.post("/query_sql")
async def execute_sql_api(request: Request):
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting SQL execution.")
    try:
        config = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        query = config.get("query")
        schema_extractor = ExtractSchema(
            db_type=config['db_type'],
            ip=config.get('ip'),
            port=config.get('port'),
            username=config.get('username'),
            password=config.get('password'),
            database=config.get('database'),
            schema_name=config.get('schema_name'),
            table_name=config['table_name'],
        )
        query_response_df = await schema_extractor.execute_query(query)
        logger.info(f"Request {request_id}: SQL execution successful.")
        return {
            "success": True,
            "data": query_response_df.to_dict(orient='records'),
        }
    except asyncio.TimeoutError:
        logger.error(f"Request {request_id}: Timeout in /query_sql")
        raise HTTPException(status_code=504, detail="Query execution timed out.")
    except Exception as e:
        logger.error(f"Request {request_id}: SQL execution failed: {e}")
        raise HTTPException(status_code=400, detail=f"SQL execution failed: {str(e)}")