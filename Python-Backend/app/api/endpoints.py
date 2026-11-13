# app/api/endpoints.py

from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.models import (
    ProcessDocumentRequest,
    QueryRequest,
    QueryResponse,
    FinancialDrafterSuggestionRequest,
    FinancialDrafterSuggestionResponse,
    DeleteDocumentsRequest,
)
from app.schemas.extraction_models import StructuredExtractionRequest
from app.services.multi_modal_processor import smart_chat_ingestion_pipeline
from app.services.structured_extractor import extract_structured_document
from app.services.llm_service import (
    get_answer_from_rag,
    financial_drafter_suggestion_pipeline,
)
from app.services.pinecone_service import get_pinecone_client

router = APIRouter()


@router.post("/process-document")
async def process_document(request: ProcessDocumentRequest, background_tasks: BackgroundTasks):
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


@router.post("/extract-structured")
async def trigger_structured_extraction(request: StructuredExtractionRequest, background_tasks: BackgroundTasks):
    """
    Triggers deterministic AI extraction for invoices, bills, and bank statements.
    Processes in background and posts result to Node backend webhook.
    """
    try:
        print(f"🟢 /extract-structured | docId={request.documentId} | hint={request.documentTypeHint}")
        background_tasks.add_task(
            extract_structured_document,
            request.documentId,
            request.s3Url,
            request.documentTypeHint or "Auto",
            request.clientStateCode,
            request.webhookUrl
        )
        return {
            "message": "Structured extraction initiated.",
            "documentId": request.documentId,
            "status": "Processing"
        }
    except Exception as e:
        print(f"❌ Failed to initiate structured extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    try:
        namespaces = request.pineconeNamespaces or []
        feature_mode = request.featureUsed or "Smart_Chat"

        print(f"🟢 /query | feature={feature_mode} | namespaces={len(namespaces)}")
        result = await get_answer_from_rag(
            request.question,
            request.chatHistory,
            namespaces,
            feature_mode
        )

        # Result is guaranteed to be a dict with answer, citations, tokens_used
        answer = result.get("answer", "")
        citations = result.get("citations", [])
        tokens_used = result.get("tokens_used")

        return QueryResponse(
            answer=answer,
            citations=citations,
            tokens_used=tokens_used
        )

    except Exception as e:
        print(f"❌ Error during query processing: {e}")
        err_str = str(e).lower()
        if "429" in err_str or "quota" in err_str or "resourceexhausted" in err_str:
            raise HTTPException(status_code=429, detail="AI assistant is experiencing high demand. Please wait a moment.")
        elif "timeout" in err_str or "deadline" in err_str:
            raise HTTPException(status_code=504, detail="AI query timed out. Please try again with a shorter prompt.")
        else:
            raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.post("/suggest-improvement", response_model=FinancialDrafterSuggestionResponse)
async def suggest_improvement(request: FinancialDrafterSuggestionRequest):
    """
    Financial Drafter Suggestion Endpoint:
    Provides inline AI suggestions for selected document text.
    """
    print("🟢 /suggest-improvement")
    try:
        if not request.selectedText or not request.selectedText.strip():
            raise HTTPException(status_code=400, detail="selectedText cannot be empty.")

        suggestion = await financial_drafter_suggestion_pipeline(
            selected_text=request.selectedText,
            document_context=request.documentContext,
            user_instruction=request.userInstruction or ""
        )

        if not suggestion or suggestion.strip() == "":
            raise HTTPException(status_code=500, detail="Empty suggestion from AI service.")

        return FinancialDrafterSuggestionResponse(suggestion=suggestion.strip())
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Suggestion error: {e}")
        raise HTTPException(status_code=502, detail="AI suggestion service is temporarily unavailable.")


@router.post("/delete-documents")
async def delete_documents(request: DeleteDocumentsRequest):
    """
    Cleans up Pinecone vectors when documents or conversations are deleted.
    """
    print(f"🗑️  /delete-documents | deleting {len(request.documents)} documents")
    errors = []
    success_count = 0

    try:
        pinecone_client = get_pinecone_client()
        index = pinecone_client.Index("cksfinbot")
    except Exception as e:
        print(f"❌ Failed to connect to Pinecone index: {e}")
        raise HTTPException(status_code=500, detail="Could not connect to vector index.")

    for item in request.documents:
        ns = item.pineconeNamespace
        if ns:
            try:
                index.delete(delete_all=True, namespace=ns)
                print(f"   ✅ Deleted Pinecone namespace: {ns}")
                success_count += 1
            except Exception as e:
                print(f"   ⚠️  Could not delete namespace {ns}: {e}")
                errors.append({"namespace": ns, "error": str(e)})

    return {
        "message": f"Processed deletion for {len(request.documents)} documents.",
        "successCount": success_count,
        "errors": errors
    }
