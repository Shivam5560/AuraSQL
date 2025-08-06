# main.py

import sys
import os
import json
import logging
import asyncio
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional
from pydantic import BaseModel, validator

# FastAPI and related imports
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path to allow imports from 'scratch'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Your application's modules
from rag.QueryEngine import insert_schema, generate_query_engine, create_namespace_from_tables
from db.extract_schema import ExtractSchema
from utils.system_prompt import system_prompt
from models.recommendations import recommendations
from utils.config import CORS_ALLOWED_ORIGINS, TIMEOUT_SECONDS

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
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Application starting up...")
    app_state["pinecone_index"] = get_pinecone_index()
    app_state["llm"] = get_llm()
    app_state["embed_model_doc"] = get_embed_model_doc()
    app_state["embed_model_query"] = get_embed_model_query()
    app_state["query_engine_cache"] = {}
    logging.info("All clients initialized successfully.")
    yield
    logging.info("Application shutting down...")
    app_state.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Request Bodies ---
class ConnectRequest(BaseModel):
    db_type: str
    ip: str
    port: int
    username: str
    password: str
    database: str
    schema_name: Optional[str] = None
    table_name: str

class MultiTableContextRequest(BaseModel):
    db_type: str
    ip: str
    port: int
    username: str
    password: str
    database: str
    schema_name: Optional[str] = None
    table_names: List[str]

class QueryRequest(BaseModel):
    query: str
    namespace_id: str

class RecommendationsRequest(BaseModel):
    namespace_id: str

class ExecuteSQLRequest(BaseModel):
    db_type: str
    ip: str
    port: int
    username: str
    password: str
    database: str
    schema_name: Optional[str] = None
    table_name: str
    query: str

class ListTablesRequest(BaseModel):
    db_type: str
    ip: str
    port: int
    username: str
    password: str
    database: str
    schema_name: Optional[str] = None

    @validator('schema_name', pre=True, always=True)
    def set_schema_name(cls, v, values):
        db_type = values.get('db_type')
        if db_type in ['mysql', 'oracle'] and v is None:
            return values.get('database')
        if db_type == 'postgresql' and v is None:
            raise ValueError('schema_name is required for PostgreSQL')
        return v

# --- API ENDPOINTS ---

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {"message": "Text-to-SQL Server is running! 🚀"}

@app.post("/connect")
async def extract_schema_api(req: ConnectRequest, request: Request):
    """Extracts schema for a single table."""
    # ... (logic remains the same)

@app.post("/list_tables")
async def list_tables_api(req: ListTablesRequest, request: Request):
    """Lists all table names for a given database and schema."""
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    
    log_message = f"Request {request_id}: Listing tables for {req.db_type}/{req.database}"
    if req.db_type == 'postgresql':
        log_message += f"/{req.schema_name}"
    
    logger.info(log_message)
    try:
        schema_extractor = ExtractSchema(
            db_type=req.db_type,
            ip=req.ip,
            port=req.port,
            username=req.username,
            password=req.password,
            database=req.database,
            schema_name=req.schema_name,
            table_name="", # table_name is not used for listing all tables
        )
        table_names = await schema_extractor.get_all_table_names()
        logger.info(f"Request {request_id}: Successfully listed {len(table_names)} tables.")
        return {"success": True, "table_names": table_names}
    except Exception as e:
        logger.error(f"Request {request_id}: Failed to list tables: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create_multitable_context")
async def create_multitable_context_api(req: MultiTableContextRequest, request: Request):
    """Creates a RAG context for multiple tables."""
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Creating multi-table context.")
    
    try:
        combined_schema = {}
        for table_name in req.table_names:
            schema_extractor = ExtractSchema(
                db_type=req.db_type, ip=req.ip, port=req.port, username=req.username,
                password=req.password, database=req.database, schema_name=req.schema_name, table_name=table_name
            )
            schema_details = await schema_extractor.extract_schema_details()
            combined_schema.update(schema_details)

        namespace_id = create_namespace_from_tables(req.db_type, req.schema_name, req.table_names)

        insert_schema(
            schema_json=combined_schema,
            namespace=namespace_id,
            pinecone_index=app_state["pinecone_index"],
            embed_model_doc=app_state["embed_model_doc"],
            query_engine_cache=app_state["query_engine_cache"]
        )

        logger.info(f"Request {request_id}: Multi-table context created with namespace: {namespace_id}")
        return {"success": True, "namespace_id": namespace_id}

    except Exception as e:
        logger.error(f"Request {request_id}: Failed to create multi-table context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_api(req: QueryRequest, request: Request):
    """Generates SQL query from a multi-table context."""
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting query generation for namespace: {req.namespace_id}")

    try:
        formatted_query = f"{system_prompt}\nUser Query:\n{req.query}"

        sql_query_json = await generate_query_engine(
            user_query=formatted_query,
            namespace=req.namespace_id,
            pinecone_index=app_state["pinecone_index"],
            llm=app_state["llm"],
            embed_model_query=app_state["embed_model_query"],
            query_engine_cache=app_state["query_engine_cache"],
            expected_output_key="sql"
        )

        if sql_query_json:
            response_data = json.loads(sql_query_json)
            logger.info(f"Request {request_id}: Query generation successful.")
            return {"success": True, **response_data}
        else:
            logger.error(f"Request {request_id}: Failed to generate SQL query.")
            raise HTTPException(status_code=500, detail="Failed to generate SQL query.")

    except Exception as e:
        logger.error(f"Request {request_id}: Error generating SQL query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommendations")
async def recommendations_api(req: RecommendationsRequest, request: Request):
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting recommendations generation for namespace: {req.namespace_id}")
    try:
        response = await recommendations(
            namespace=req.namespace_id,
            pinecone_index=app_state["pinecone_index"],
            llm=app_state["llm"],
            embed_model_query=app_state["embed_model_query"],
            query_engine_cache=app_state["query_engine_cache"],
            expected_output_key="recommendations"
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

@app.post("/query_sql")
async def execute_sql_api(req: ExecuteSQLRequest, request: Request):
    request_id = request.state.request_id
    logger = logging.getLogger(__name__)
    logger.info(f"Request {request_id}: Starting SQL execution.")
    try:
        schema_extractor = ExtractSchema(
            db_type=req.db_type,
            ip=req.ip,
            port=req.port,
            username=req.username,
            password=req.password,
            database=req.database,
            schema_name=req.schema_name,
            table_name=req.table_name, # This might not be used if query is generic
        )
        query_response_df = await schema_extractor.execute_query(req.query)
        logger.info(f"Request {request_id}: SQL execution successful.")
        return {
            "success": True,
            "data": query_response_df.to_dict(orient='records'),
            "columns": query_response_df.columns.tolist(),
        }
    except asyncio.TimeoutError:
        logger.error(f"Request {request_id}: Timeout in /query_sql")
        raise HTTPException(status_code=504, detail="Query execution timed out.")
    except Exception as e:
        logger.error(f"Request {request_id}: SQL execution failed: {e}")
        raise HTTPException(status_code=400, detail=f"SQL execution failed: {str(e)}")

