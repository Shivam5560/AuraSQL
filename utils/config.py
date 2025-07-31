import os
from dotenv import load_dotenv

load_dotenv()

# Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = "tableindex"

# Groq
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Cohere
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
COHERE_EMBED_MODEL_DOC = "embed-v4.0"
COHERE_EMBED_MODEL_QUERY = "embed-v4.0"

# FastAPI
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://172.20.10.3:3000",
    "https://txt2sql-git-master-shivam5560s-projects.vercel.app/",
    "https://*.vercel.app",
    "https://txt2sql-gamma.vercel.app",
]
TIMEOUT_SECONDS = 20
