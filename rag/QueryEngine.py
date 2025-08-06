import os
import json
import hashlib
import sqlparse
from dotenv import load_dotenv
from llama_index.core import (
    VectorStoreIndex,
    Settings,
    StorageContext,
    Document
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.vector_stores.pinecone import PineconeVectorStore
from utils.clean_format import clean_json
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load environment variables once, although they should be loaded by main.py
load_dotenv()

def create_namespace_from_tables(db_type: str, schema_name: str, table_names: list[str]) -> str:
    """Creates a unique, deterministic namespace ID from a list of table names."""
    sorted_tables = "_".join(sorted(table_names))
    # Use a hash to keep the namespace short and manageable
    hasher = hashlib.sha256(sorted_tables.encode())
    return f"{db_type}_{schema_name}__{hasher.hexdigest()[:16]}"

def insert_schema(
    schema_json: dict,
    namespace: str,
    *,
    pinecone_index,
    embed_model_doc,
    query_engine_cache: dict
):
    """
    Inserts a combined schema for multiple tables into a specific Pinecone namespace.
    """
    try:
        logging.info(f"Starting schema insertion process for namespace: {namespace}")

        stats = pinecone_index.describe_index_stats()
        if len(stats["namespaces"]) >= 100:
            logging.warning("Namespace limit is close to 100.")

        if namespace in stats["namespaces"]:
            logging.info(f"Clearing vectors in existing namespace: {namespace}")
            pinecone_index.delete(delete_all=True, namespace=namespace)

        Settings.embed_model = embed_model_doc
        logging.info("Document embeddings model set.")

        # Create one document per table to improve retrieval accuracy
        documents = [
            Document(text=f"Table `{table_name}`: {json.dumps(schema)}")
            for table_name, schema in schema_json.items()
        ]

        text_splitter = SentenceSplitter(chunk_size=1536, chunk_overlap=100)
        nodes = text_splitter.get_nodes_from_documents(documents)

        vector_store = PineconeVectorStore(pinecone_index=pinecone_index, namespace=namespace)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        VectorStoreIndex(nodes=nodes, storage_context=storage_context)
        
        if namespace in query_engine_cache:
            del query_engine_cache[namespace]
            logging.info(f"Removed outdated query engine from cache for namespace: {namespace}")

        logging.info(f"Schema added to Pinecone successfully under namespace: {namespace}")
        return True

    except Exception as e:
        logging.error(f"Unexpected error in insert_schema: {e}")
        traceback.print_exc()
        return False

async def generate_query_engine(
    user_query: str,
    namespace: str,
    *,
    pinecone_index,
    llm,
    embed_model_query,
    query_engine_cache: dict,
    expected_output_key: str, # New parameter
    max_retries: int = 2
):
    """
    Generates a query response using a cached or new query engine from a specific namespace.
    """
    if namespace in query_engine_cache:
        logging.info(f"Using cached query engine for namespace: {namespace}")
        query_engine = query_engine_cache[namespace]
    else:
        logging.info(f"Creating new query engine for namespace: {namespace}")
        Settings.llm = llm
        Settings.embed_model = embed_model_query

        vector_store = PineconeVectorStore(pinecone_index=pinecone_index, namespace=namespace)
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
        retriever = index.as_retriever(similarity_top_k=5)
        
        query_engine = RetrieverQueryEngine.from_args(
            retriever=retriever,
            llm=Settings.llm
        )
        query_engine_cache[namespace] = query_engine
        logging.info(f"New query engine created and cached for namespace: {namespace}")

    for attempt in range(max_retries):
        try:
            logging.info(f"Executing query attempt {attempt + 1}...")
            response = await query_engine.aquery(user_query)
            
            cleaned_response_str = clean_json(response.response)
            # logging.info(f"Raw LLM response (cleaned): {cleaned_response_str}") # Added logging
            
            response_json = json.loads(cleaned_response_str)
            
            # Check for the expected key
            if expected_output_key not in response_json:
                raise ValueError(f"LLM response did not contain '{expected_output_key}' key.")

            # Only perform SQL validation if expected_output_key is 'sql'
            if expected_output_key == 'sql':
                sql_query = response_json.get("sql")
                if sql_query is None:
                    raise ValueError("LLM response 'sql' value was null.")
                parsed = sqlparse.parse(sql_query)
                if not parsed or parsed[0].get_type() == 'UNKNOWN':
                    raise ValueError("Generated SQL has invalid syntax.")

            logging.info("Query generated and validated successfully.")
            return cleaned_response_str.strip()

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logging.warning(f"Attempt {attempt + 1} failed: {e}. Retrying...")
            user_query = (
                f"{user_query}\n\nPrevious attempt failed. Please fix the following error: {e}. "
                f"Regenerate the JSON, ensuring the format is correct and contains the '{expected_output_key}' key."
            )
            if attempt + 1 == max_retries:
                logging.error("Max retries reached. Failed to generate valid response.")
                return None
        except Exception as e:
            logging.error(f"An unexpected error occurred in generate_query_engine: {e}")
            traceback.print_exc()
            return None

    return None
