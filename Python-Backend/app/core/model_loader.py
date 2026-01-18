from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings
import sys

# Ensure singleton patterns or global instances

print("⏳ Initializing Global Models...")

try:
    embedding_model = HuggingFaceEmbeddings(
        model_name='sentence-transformers/all-MiniLM-L6-v2',
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    print("✅ Global Embeddings Model loaded.")
except Exception as e:
    print(f"❌ Failed to load Global Embeddings Model: {e}")
    embedding_model = None

try:
    # Using Gemini 2.0 Flash Lite as the primary LLM
    llm_model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0, 
        google_api_key=settings.GOOGLE_API_KEY, 
        convert_system_message_to_human=True
    )
    print("✅ Global LLM Model loaded.")
except Exception as e:
    print(f"❌ Failed to load Global LLM Model: {e}")
    llm_model = None
