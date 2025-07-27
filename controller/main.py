# main driver code for the orchestration of the application
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from scratch.rag.QueryEngine import insert_schema, generate_query_engine  # Use the synchronous insert_schema
from fastapi import FastAPI, HTTPException, Request
from scratch.db.extract_schema import ExtractSchema
from scratch.utils.clean_format import clean_json
# Add the root directory to sys.path
import json

global_db_type = []
global_table_name = []  

app = FastAPI()
@app.get("/")
async def root():
    return {"message": "Text-to-SQL Server is running! 🚀"}

@app.post("/extract-schema")
async def extract_schema(request: Request):  # Use FastAPI's Request object
    """Extract database schema information"""
    try:
        config = await request.json()  # Parse JSON body from the request
        schema_extractor = ExtractSchema(
            db_type=config['db_type'],
            ip=config.get('ip'),
            port=config.get('port'),
            username=config.get('username'),
            password=config.get('password'),
            database=config.get('database'),
            schema_name=config.get('schema_name'),  # Use schema_name from the request
            table_name=config['table_name']
        )
        schema_details = schema_extractor.extract_schema_details()
        global_db_type.append(config['db_type'])
        global_table_name.append(config['table_name'])  # Store the table name globally
        # Ensure the response is JSON-compliant
        return {
            "success": True,
            "schema": schema_details,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema extraction failed: {str(e)}")
    
# Schema details that we got from extract_schema api   
# We will use db_type schema_name and table_name from the frontend side as request body

@app.post("/insert_schema")
async def insert_schema_api(request: Request):
    data = await request.json()
    db_type = data.get("db_type")
    table_name = data.get("table_name")
    schema_name = data.get("schema_name")
    schema_details = data.get("schema_details", None)
    """Process a text-to-SQL query"""
    try:
        # Call the synchronous insert_schema function
        if insert_schema(schema_details, db_type, schema_name, table_name):
            return {"success": True, "message": "Schema inserted successfully."}
        else:
            raise HTTPException(status_code=500, detail="Failed to insert schema.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting schema: {str(e)}")
    
@app.post("/query")
async def query_api(request: Request):
    data = await request.json()
    db_type = data.get("db_type")
    table_name = data.get("table_name")
    schema_name = data.get("schema_name")
    user_query = data.get("query", None)
    """Generate SQL query from user input"""
    try:
         # Validate user query
        if not user_query:
            raise HTTPException(status_code=400, detail="User query cannot be empty.")
        sql_query = generate_query_engine(user_query, db_type, schema_name, table_name)
        sql_query = json.loads(sql_query.strip())  # Ensure the response is in JSON format
        if sql_query:
            return {"success": True, "sql": sql_query.get("sql", "")}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate SQL query.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating SQL query: {str(e)}")


# STart the FastAPI application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
