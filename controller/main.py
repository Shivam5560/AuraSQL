# main driver code for the orchestration of the application
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from scratch.rag.QueryEngine import insert_schema, generate_query_engine  # Use the synchronous insert_schema
from fastapi import FastAPI, HTTPException, Request
from scratch.db.extract_schema import ExtractSchema
from scratch.utils.clean_format import clean_json
from scratch.utils.system_prompt import system_prompt  # Import the system prompt
from scratch.models.recommendations import recommendations  # Import the prompt for recommendations
# Add the root directory to sys.path
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import logging

global_db_type = []
global_table_name = []  

app = FastAPI()
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://172.20.10.3:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO)

TIMEOUT_SECONDS = 20  # Set a reasonable timeout for all blocking operations

@app.get("/")
async def root():
    return {"message": "Text-to-SQL Server is running! 🚀"}

@app.post("/extract-schema")
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
        global_db_type.append(config['db_type'])
        global_table_name.append(config['table_name'])
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
    
# Schema details that we got from extract_schema api   
# We will use db_type schema_name and table_name from the frontend side as request body

@app.post("/insert_schema")
async def insert_schema_api(request: Request):
    try:
        data = await asyncio.wait_for(request.json(), timeout=TIMEOUT_SECONDS)
        db_type = data.get("db_type")
        table_name = data.get("table_name")
        schema_name = data.get("schema_name")
        schema_details = data.get("schema_details", None)
        def do_insert():
            return insert_schema(schema_details, db_type, schema_name, table_name)
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
        db_type = data.get("db_type")
        table_name = data.get("table_name")
        schema_name = data.get("schema_name")
        user_query = data.get("query", None)
        if not user_query:
            raise HTTPException(status_code=400, detail="User query cannot be empty.")
        def do_generate():
            formatted_query = f"{system_prompt}\nUser Query:\n{user_query}\nTable Name: {table_name}\nDb Type: {db_type}\n"
            sql_query = generate_query_engine(formatted_query, db_type, schema_name, table_name)
            return json.loads(sql_query.strip())
        sql_query = await asyncio.get_event_loop().run_in_executor(None, do_generate)
        if sql_query:
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
        db_type = data.get("db_type")
        table_name = data.get("table_name")
        schema_name = data.get("schema_name")
        # Await the async recommendations function
        response = await recommendations(db_type, schema_name, table_name)
        if response:
            return {"success": True, "recommendations": response.get("recommendations", [])}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate recommendations.")
    except asyncio.TimeoutError:
        logging.error("Timeout in /recommendations")
        raise HTTPException(status_code=504, detail="Recommendations timed out.")
    except Exception as e:
        logging.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

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

