import os
import json
from dotenv import load_dotenv  # Import dotenv to load environment variables
from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    Settings,
    StorageContext,
    Document
)
import time
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.groq import Groq
import traceback
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.core.query_engine import RetrieverQueryEngine
import pinecone
from llama_index.embeddings.cohere import CohereEmbedding
from scratch.utils.system_prompt import system_prompt # Import the system prompt from utils
from scratch.utils.clean_format import clean_json  # Import the clean_json function
import logging  # Add logging for better debugging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load environment variables from a .env file
load_dotenv()

def insert_schema(schema_json, db_type, schema_name, table_name):
    try:
        logging.info("Starting schema insertion process...")
        # Convert schema JSON (dict) to a JSON string
        schema_text = json.dumps(schema_json)
        documents = [Document(text=schema_text)]  # Pass the JSON string to Document

        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pinecone_index_name = "tableindex"
        namespace = f"{db_type}_{schema_name}_{table_name}"  # Use the namespace format {table_name}_{db_type}

        pc = pinecone.Pinecone(api_key=pinecone_api_key)
        pinecone_index = pc.Index(pinecone_index_name)

        # Check the number of namespaces
        namespaces = pinecone_index.describe_index_stats()["namespaces"]
        if len(namespaces) >= 100:
            logging.warning("Namespace limit is close to 100. Removing all namespaces...")
            for ns in namespaces.keys():
                pinecone_index.delete(delete_all=True, namespace=ns)
            logging.info("All namespaces cleared.")

        # Check if the specific namespace exists before clearing
        if namespace in namespaces:
            logging.info(f"Clearing vectors in namespace: {namespace}")
            pinecone_index.delete(delete_all=True, namespace=namespace)
        else:
            logging.info(f"Namespace '{namespace}' does not exist. Skipping clearing step.")

        cohere_api_key = os.getenv("COHERE_API_KEY")
        doc_embed_model = CohereEmbedding(
            api_key=cohere_api_key,
            model_name="embed-v4.0",
            input_type="search_document",
        )
        Settings.embed_model = doc_embed_model
        logging.info("Embeddings initialized successfully.")

        # Split documents into nodes
        text_splitter = SentenceSplitter(chunk_size=1536, chunk_overlap=100)
        logging.info("Splitting documents into nodes...")
        nodes = text_splitter.get_nodes_from_documents(documents)

        vector_store = PineconeVectorStore(
            pinecone_index=pinecone_index,
            namespace=namespace  # Use the specific namespace
        )
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        # Index the schema nodes with embeddings
        index = VectorStoreIndex(
            nodes=nodes,
            storage_context=storage_context,
            show_progress=True,
        )

        logging.info(f"Schema added to Pinecone successfully under namespace: {namespace}")
        return True

    except ValueError as ve:
        logging.error(f"ValueError in insert_schema: {ve}")
        traceback.print_exc()
        return False
    except Exception as e:
        logging.error(f"Unexpected error in insert_schema: {e}")
        traceback.print_exc()
        return False

def generate_query_engine(user_query, db_type, schema_name, table_name):
    try:
        logging.info("Initializing query engine...")
        cohere_api_key = os.getenv("COHERE_API_KEY")
        query_embed_model = CohereEmbedding(
            api_key=cohere_api_key,
            model_name="embed-v4.0",
            input_type="search_query",
        )
        Settings.embed_model = query_embed_model
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        pinecone_index_name = "tableindex"
        pc = pinecone.Pinecone(api_key=pinecone_api_key)
        pinecone_index = pc.Index(pinecone_index_name)
        key = os.getenv("GROQ_API_KEY")
        llm = Groq(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            api_key=key,
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        # Set the system prompt for the LLM
        Settings.llm = llm

        logging.info("Setting up Query Engine.")

        # Retrieve existing vectors
        vector_store = PineconeVectorStore(
            pinecone_index=pinecone_index,
            namespace = f"{db_type}_{schema_name}_{table_name}"# Use the specific namespace
        )
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_vector_store(vector_store)

        # Setup query engine
        retriever = index.as_retriever(similarity_top_k=5)
        retriever.embed_model = query_embed_model
        query_engine = RetrieverQueryEngine.from_args(
            retriever=retriever,
            llm=Settings.llm
        )
        
        logging.info("Executing query...")
        response = query_engine.query(user_query)

        logging.info("Query executed successfully.")
        # logging.info(f"Response: {response}")
        response = clean_json(response.response)  # Ensure the response is in the expected JSON format
        print("Response cleaned and formatted successfully.")
        return response.strip()

    except Exception as e:
        logging.error(f"An error occurred in generate_query_engine: {e}")
        traceback.print_exc()
        return None