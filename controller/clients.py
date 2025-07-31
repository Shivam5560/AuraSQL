import pinecone
from llama_index.llms.groq import Groq
from llama_index.embeddings.cohere import CohereEmbedding
from utils.config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    GROQ_MODEL,
    GROQ_API_KEY,
    COHERE_API_KEY,
    COHERE_EMBED_MODEL_DOC,
    COHERE_EMBED_MODEL_QUERY,
)

def get_pinecone_index():
    return pinecone.Pinecone(api_key=PINECONE_API_KEY).Index(PINECONE_INDEX_NAME)

def get_llm():
    return Groq(
        model=GROQ_MODEL,
        api_key=GROQ_API_KEY,
        response_format={"type": "json_object"},
        temperature=0.1,
        max_completion_tokens=512,
        stream=False,
    )

def get_embed_model_doc():
    return CohereEmbedding(
        api_key=COHERE_API_KEY, model_name=COHERE_EMBED_MODEL_DOC, input_type="search_document"
    )

def get_embed_model_query():
    return CohereEmbedding(
        api_key=COHERE_API_KEY, model_name=COHERE_EMBED_MODEL_QUERY, input_type="search_query"
    )
