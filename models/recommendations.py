import json
from rag.QueryEngine import generate_query_engine
from utils.prompt_recommendations import prompt
import logging
import asyncio

async def recommendations(
    namespace: str,
    *,
    pinecone_index,
    llm,
    embed_model_query,
    query_engine_cache: dict
):
    """
    Generates recommendations by asynchronously calling the query engine.
    """
    try:
        recommendations_json = await generate_query_engine(
            user_query=prompt,
            namespace=namespace,
            pinecone_index=pinecone_index,
            llm=llm,
            embed_model_query=embed_model_query,
            query_engine_cache=query_engine_cache
        )
        
        if recommendations_json is None:
            raise ValueError("Received no response from the query engine.")

        return json.loads(recommendations_json)

    except Exception as e:
        logging.error(f"An unexpected error occurred in recommendations: {e}")
        raise