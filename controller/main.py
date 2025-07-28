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
import pinecone
from llama_index.llms.groq import Groq
from llama_index.embeddings.cohere import CohereEmbedding

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
    app_state["pinecone_index"] = pinecone.Pinecone(api_key=os.getenv("PINECONE_API_KEY")).Index("tableindex")
    app_state["llm"] = Groq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        response_format={"type": "json_object"},
        temperature=0.1,
        max_completion_tokens=512,
        stream=False,
    )
    app_state["embed_model_doc"] = CohereEmbedding(
        api_key=os.getenv("COHERE_API_KEY"), model_name="embed-v4.0", input_type="search_document"
    )
    app_state["embed_model_query"] = CohereEmbedding(
        api_key=os.getenv("COHERE_API_KEY"), model_name="embed-v4.0", input_type="search_query"
    )
    app_state["query_engine_cache"] = {}
    
    logging.info("All clients initialized successfully.")
    
    yield  # The application is now running

    logging.info("Application shutting down...")
    app_state.clear()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://172.20.10.3:3000", "https://txt2sql-git-master-shivam5560s-projects.vercel.app/", "https://*.vercel.app", "https://txt2sql-gamma.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TIMEOUT_SECONDS = 20  # Using the timeout from your original file

# --- 2. API ENDPOINTS ---

@app.get("/")
async def root():
    return {"message": "Text-to-SQL Server is running! 🚀"}

# This endpoint is restored to its original implementation
@app.post("/connect")
async def extract_schema(request: Request):
    """Extract database schema information"""
    try:
        config = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        async def do_extract():
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
            return schema_extractor.extract_schema_details()
        schema_details = await asyncio.wait_for(do_extract(), timeout=TIMEOUT_SECONDS)
        # Note: Using global variables like this is not recommended in a production server
        # as it's not safe with multiple workers. The data should be passed in each request.
        # global_db_type.append(config['db_type'])
        # global_table_name.append(config['table_name'])
        return {
            "success": True,
            "schema": schema_details,
        }
    except asyncio.TimeoutError:
        logging.error("Timeout in /extract-schema")
        raise HTTPException(status_code=504, detail="Schema extraction timed out.")
    except Exception as e:
        logging.error(f"Schema extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"Schema extraction failed: {str(e)}")

# This endpoint is OPTIMIZED
@app.post("/insert_schema")
async def insert_schema_api(request: Request):
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        
        do_insert = partial(
            insert_schema,
            schema_json=data.get("schema_details"),
            db_type=data.get("db_type"),
            schema_name=data.get("schema_name"),
            table_name=data.get("table_name"),
            pinecone_index=app_state["pinecone_index"],
            embed_model_doc=app_state["embed_model_doc"],
            query_engine_cache=app_state["query_engine_cache"]
        )

        result = await asyncio.get_event_loop().run_in_executor(None, do_insert)

        if result:
            return {"success": True, "message": "Schema inserted successfully."}
        else:
            raise HTTPException(status_code=500, detail="Failed to insert schema.")
            
    except asyncio.TimeoutError:
        logging.error("Timeout in /insert_schema")
        raise HTTPException(status_code=504, detail="Schema insert timed out.")
    except Exception as e:
        logging.error(f"Error inserting schema: {e}")
        raise HTTPException(status_code=500, detail=f"Error inserting schema: {str(e)}")

@app.post("/query")
async def query_api(request: Request):
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        user_query = data.get("query")
        if not user_query:
            raise HTTPException(status_code=400, detail="User query cannot be empty.")
            
        formatted_query = f"{system_prompt}\nUser Query:\n{user_query}\nTable Name: {data.get('table_name')}\nDb Type: {data.get('db_type')}\n"

        # --- The Main Change ---
        # No more functools.partial or run_in_executor needed for this call.
        # We can await the async function directly.
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
            return {"success": True, "sql": sql_query.get("sql", "")}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate SQL query.")
            
    except asyncio.TimeoutError:
        logging.error("Timeout in /query")
        raise HTTPException(status_code=504, detail="SQL generation timed out.")
    except Exception as e:
        logging.error(f"Error generating SQL query: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating SQL query: {str(e)}")

@app.post("/recommendations")
async def recommendations_api(request: Request):
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)

        # --- THIS IS THE LINE TO FIX ---
        # Add the "await" keyword before the function call.
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
            # This line will now work because 'response' is a dictionary
            return {"success": True, "recommendations": response.get("recommendations", [])}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate recommendations.")

    except asyncio.TimeoutError:
        logging.error("Timeout in /recommendations")
        raise HTTPException(status_code=504, detail="Recommendations timed out.")
    except Exception as e:
        logging.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

# This endpoint is restored to its original implementation
@app.post("/query_sql")
async def execute_sql(request: Request):
    try:
        config = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        query = config.get("query")
        def do_query():
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
            return schema_extractor.execute_query(query)
        query_response_df = await asyncio.get_event_loop().run_in_executor(None, do_query)
        return {
            "success": True,
            "data": query_response_df.to_dict(orient='records'),
        }
    except asyncio.TimeoutError:
        logging.error("Timeout in /query_sql")
        raise HTTPException(status_code=504, detail="Query execution timed out.")
    except Exception as e:
        logging.error(f"Schema extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"Schema extraction failed: {str(e)}")