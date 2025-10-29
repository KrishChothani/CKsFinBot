# app/api/endpoints.py

from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.models import ProcessDocumentRequest, QueryRequest, QueryResponse
from app.services.multi_modal_processor import smart_chat_ingestion_pipeline
from app.services.llm_service import get_answer_from_rag

router = APIRouter()

@router.post("/process-document")
async def process_document(request: ProcessDocumentRequest, background_tasks: BackgroundTasks):
    """
    Receives a document and starts the multi-modal ingestion process.
    """
    try:
        background_tasks.add_task(
            smart_chat_ingestion_pipeline,
            request.documentId,
            request.s3Url,
            request.pineconeNamespace
        )
        return {
            "message": "Smart Chat document processing started.",
            "documentId": request.documentId
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Receives a query and routes it to the correct RAG pipeline based on the conversation's feature mode.
    """
    try:
        answer = await get_answer_from_rag(
            request.question,
            request.chatHistory,
            request.pineconeNamespaces,
            request.featureUsed
        )
        return QueryResponse(answer=answer)
    
    except Exception as e:
        print(f"Error during query processing: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: An internal error occurred.")