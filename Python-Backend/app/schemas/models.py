from pydantic import BaseModel
from typing import List, Dict, Any

# --- Request Models ---

class ProcessDocumentRequest(BaseModel):
    documentId: str
    s3Url: str
    pineconeNamespace: str

class QueryRequest(BaseModel):
    question: str
    chatHistory: List[Dict[str, str]]  # More specific: [{"role": "user", "content": "..."}]
    pineconeNamespaces: List[str]
    featureUsed: str 

# --- Response Models ---

class QueryResponse(BaseModel):
    answer: str