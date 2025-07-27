from llama_index.llms.groq import Groq
import os
def recommendtions(schema_details):
    """This function provides recommendations based on the current context of the extracted schema detaills"""
    key = os.getenv("GROQ_API_KEY")
    llm = Groq(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        api_key=key,
        response_format={"type": "json_object"},
        temperature=0.1,
    )