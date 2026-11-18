from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# --- Request Models ---

class ProcessDocumentRequest(BaseModel):
    documentId: str
    s3Url: str
    pineconeNamespace: str

class QueryRequest(BaseModel):
    question: str
    chatHistory: List[Dict[str, Any]] = []
    pineconeNamespaces: List[str] = []
    featureUsed: Optional[str] = "Smart_Chat"
    documentIds: Optional[List[str]] = None
    userId: Optional[str] = "default_user"
    enableWebSearch: Optional[bool] = False
    correlationId: Optional[str] = None

class DeleteDocumentItem(BaseModel):
    pineconeNamespace: Optional[str] = None
    documentId: Optional[str] = None
    s3Url: Optional[str] = None
    userId: Optional[str] = None

class DeleteDocumentsRequest(BaseModel):
    documents: List[DeleteDocumentItem]

# --- Drafter Suggestion Models ---

class FinancialDrafterSuggestionRequest(BaseModel):
    selectedText: str
    documentContext: str
    userInstruction: Optional[str] = ""

class FinancialDrafterSuggestionResponse(BaseModel):
    suggestion: str

# Backward compatibility alias
LegalDrafterSuggestionRequest = FinancialDrafterSuggestionRequest
LegalDrafterSuggestionResponse = FinancialDrafterSuggestionResponse

# --- Citation & Response Models ---

class CitationItem(BaseModel):
    index: int
    citationType: Optional[str] = "document"
    title: Optional[str] = ""
    url: Optional[str] = ""
    documentId: Optional[str] = None
    fileName: Optional[str] = None
    pageNumber: Optional[float] = None
    pageSpan: Optional[List[int]] = None
    snippet: Optional[str] = None
    bboxes: Optional[List[Dict[str, Any]]] = None
    confidenceScore: Optional[float] = 1.0

    class Config:
        extra = "allow"

class QueryResponse(BaseModel):
    answer: str
    citations: List[CitationItem] = []
    tokens_used: Optional[int] = None
