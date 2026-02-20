import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from .logging_service import logger

load_dotenv()

def get_llm(model="gpt-4o-mini"):
    logger.debug(f"Initializing ChatOpenAI with model: {model}")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables.")
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return ChatOpenAI(model=model, api_key=api_key)
