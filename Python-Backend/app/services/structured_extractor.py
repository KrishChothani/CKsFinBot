# app/services/structured_extractor.py
"""
AI Structured Extraction Engine for Financial Documents.
Downloads PDF/Images, processes with PyMuPDF, and invokes Gemini with strict JSON schemas.
Enriches and reconciles extracted data with deterministic tax validation.
"""

import json
import base64
import requests
import pymupdf as fitz
from typing import Dict, Any, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.model_loader import llm_model
from app.core.config import settings
from app.services.s3_service import download_file_from_s3
from app.services.tax_validator import validate_invoice_arithmetic, validate_gstin
from app.schemas.extraction_models import (
    InvoiceExtractionSchema,
    BankStatementExtractionSchema,
    StructuredExtractionResponse,
    ValidationResultSchema
)

INVOICE_EXTRACTION_SYSTEM_PROMPT = """
You are an expert Indian Chartered Accountant and Tax Automation AI.
Extract structured data from the provided financial document (Invoice, Bill, Credit/Debit Note, or Receipt).
Extract with extreme precision adhering to Indian GST standards:
- Identify if it is Purchase_Invoice, Sales_Invoice, Expense_Bill, or Credit_Note.
- supplierName, supplierGstin, supplierAddress.
- customerName, customerGstin, customerAddress.
- invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate, placeOfSupply.
- lineItems: Array of objects with description, hsnCode, quantity, unit, rate, taxableAmount, gstRate, cessAmount.
- subTotal, totalCgst, totalSgst, totalIgst, totalCess, roundOff, grandTotal.
- Assign a confidence score (0.0 to 1.0) for each field in confidenceScores.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object matching the requested schema. No markdown formatting, no conversational text.
2. If a field is not visible in the document, return null. Do NOT invent or hallucinate data.
3. For dates, standardize to YYYY-MM-DD format.
"""

BANK_STATEMENT_SYSTEM_PROMPT = """
You are an expert Banking and Financial Statement Analyzer.
Extract structured banking data from the provided Indian bank statement:
- bankName, accountNumber, ifscCode, accountHolderName.
- openingBalance, closingBalance, periodStart (YYYY-MM-DD), periodEnd (YYYY-MM-DD).
- transactions: Array of objects with date (YYYY-MM-DD), narration, referenceNumber, debit (positive number or 0), credit (positive number or 0), balance.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object. No markdown, no commentary.
2. Ensure every transaction line is accurately captured in chronological order.
"""

async def extract_structured_document(
    document_id: str,
    s3_url: str,
    document_type_hint: str = "Auto",
    client_state_code: Optional[str] = None,
    webhook_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Downloads file from s3_url, extracts raw text and page renders, executes Gemini extraction,
    runs deterministic validation, and notifies webhook.
    """
    print(f"\n⚡ ===== STARTING STRUCTURED EXTRACTION =====")
    print(f"📄 Doc ID: {document_id} | Hint: {document_type_hint} | URL: {s3_url[:50]}...")

    try:
        # Step 1: Download file to local temporary storage
        local_file_path = download_file_from_s3(s3_url)
        print(f"⬇️  File downloaded: {local_file_path}")

        # Step 2: Open with PyMuPDF to extract text and render high-res page image for Vision
        doc = fitz.open(local_file_path)
        page_count = len(doc)
        print(f"📖 PDF / Document opened: {page_count} pages.")

        extracted_text = ""
        page_images = []

        for page_num in range(min(page_count, 5)): # Process up to first 5 pages for extraction
            page = doc[page_num]
            extracted_text += f"\n--- Page {page_num + 1} ---\n" + page.get_text()

            # Render page to pixmap for multi-modal vision
            pix = page.get_pix_map(dpi=150)
            img_bytes = pix.tobytes("jpeg")
            b64_img = base64.b64encode(img_bytes).decode("utf-8")
            page_images.append(b64_img)

        doc.close()

        # Step 3: Classify document type if hint is "Auto"
        is_bank_statement = False
        text_lower = extracted_text.lower()
        if "bank_statement" in document_type_hint.lower() or "statement of account" in text_lower or "bank statement" in text_lower:
            if "tax invoice" not in text_lower and "gstin" not in text_lower:
                is_bank_statement = True

        # Step 4: Call Gemini for structured JSON extraction
        if is_bank_statement:
            doc_type = "Bank_Statement"
            system_prompt = BANK_STATEMENT_SYSTEM_PROMPT
            schema_target = BankStatementExtractionSchema
        else:
            doc_type = "Purchase_Invoice"
            if "tax invoice" in text_lower and "bill to" in text_lower:
                doc_type = "Purchase_Invoice"
            system_prompt = INVOICE_EXTRACTION_SYSTEM_PROMPT
            schema_target = InvoiceExtractionSchema

        # Build multi-modal message
        content_payload = [
            {"type": "text", "text": f"Analyze this financial document and extract all fields according to schema.\nExtracted Text:\n{extracted_text[:4000]}"}
        ]
        
        # Attach the primary page image for vision extraction
        if page_images:
            content_payload.append({
                "type": "image_url",
                "image_url": f"data:image/jpeg;base64,{page_images[0]}"
            })

        print(f"🤖 Calling Gemini structured extraction model for {doc_type}...")

        # Structured output invocation
        try:
            structured_llm = llm_model.with_structured_output(schema_target)
            extraction_result = await structured_llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=content_payload)
            ])
            raw_data = extraction_result.dict() if hasattr(extraction_result, "dict") else dict(extraction_result)
        except Exception as llm_err:
            print(f"⚠️  Structured output helper failed, falling back to JSON parsing: {llm_err}")
            json_prompt = system_prompt + "\nOUTPUT JSON ONLY."
            resp = await llm_model.ainvoke([
                SystemMessage(content=json_prompt),
                HumanMessage(content=content_payload)
            ])
            cleaned = resp.content.strip().replace("```json", "").replace("```", "").strip()
            raw_data = json.loads(cleaned)

        print(f"✅ Gemini extracted {len(raw_data.keys())} top-level fields.")

        # Step 5: Execute deterministic tax & arithmetic validation
        validation_results = {
            "isMathValid": True,
            "isGstinChecksumValid": True,
            "hasTaxMismatch": False,
            "errors": [],
            "warnings": []
        }

        if not is_bank_statement:
            enriched_data, val_results = validate_invoice_arithmetic(raw_data, client_state_code)
            raw_data = enriched_data
            validation_results = val_results
            print(f"🧮 Deterministic Math Validation: Valid={validation_results['isMathValid']} | Errors={len(validation_results['errors'])}")

        # Step 6: Compute overall extraction confidence score
        confidence = 0.92
        if validation_results.get("errors"):
            confidence = max(0.5, confidence - 0.15 * len(validation_results["errors"]))
        if not validation_results.get("isGstinChecksumValid"):
            confidence = max(0.6, confidence - 0.1)

        final_payload = {
            "documentId": document_id,
            "documentType": doc_type,
            "extractionConfidence": round(confidence, 2),
            "invoiceData": raw_data if not is_bank_statement else None,
            "bankData": raw_data if is_bank_statement else None,
            "validationResults": validation_results,
            "rawTextPreview": extracted_text[:1000]
        }

        # Step 7: Send completion webhook to Node Backend
        target_webhook = webhook_url or f"{settings.NODE_WEBHOOK_URL}/api/v1/documents/{document_id}/extraction/webhook"
        print(f"📡 Sending extraction completion webhook to {target_webhook}...")
        try:
            webhook_res = requests.post(
                target_webhook,
                json=final_payload,
                timeout=30
            )
            print(f"✅ Webhook acknowledged: HTTP {webhook_res.status_code}")
        except Exception as wh_err:
            print(f"⚠️  Webhook delivery error: {wh_err}")

        print(f"🎉 ===== STRUCTURED EXTRACTION COMPLETED =====\n")
        return final_payload

    except Exception as e:
        print(f"❌ Structured extraction failed: {str(e)}")
        # Send failure notification
        try:
            target_webhook = webhook_url or f"{settings.NODE_WEBHOOK_URL}/api/v1/documents/{document_id}/extraction/webhook"
            requests.post(
                target_webhook,
                json={
                    "documentId": document_id,
                    "status": "failed",
                    "errorMessage": str(e)
                },
                timeout=15
            )
        except Exception:
            pass
        raise e

