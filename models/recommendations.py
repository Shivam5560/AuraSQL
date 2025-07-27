from llama_index.llms.groq import Groq
from scratch.rag.QueryEngine import generate_query_engine
from scratch.utils.prompt_recommendations import prompt
from scratch.utils.clean_format import clean_json
import json
import os
def recommendations(db_type, schema_name, table_name):
    recommendations = generate_query_engine(
        user_query=prompt,
        db_type=db_type,
        schema_name=schema_name,
        table_name=table_name
    )
    try:
        return json.loads(recommendations.strip())  # Ensure the response is in JSON format
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to decode JSON response in recommendations: {e}")
    except Exception as e:
        raise ValueError(f"An unexpected error occurred in recommendations: {e}")