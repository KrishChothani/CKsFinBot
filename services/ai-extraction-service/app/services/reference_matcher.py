# app/services/reference_matcher.py
"""
Reference Matcher & Extraction Evidence Binder.

FINTECH PRINCIPLE: Extract by reference.
Every extracted field is matched against document word tokens.
Attaches:
- rawText
- normalizedValue (e.g. integer paise for money, ISO date for dates)
- page number
- boundingBox: [x0, y0, x1, y1] normalized to 0-1000
- source: 'text-layer' | 'ocr' | 'llm-mapped'
- isLocated: bool
- disagreement: Optional candidate discrepancy flag
"""

from typing import Dict, Any, List
from app.services.text_layer_extractor import locate_phrase_in_tokens
from app.core.money import to_paise

def bind_field_reference(
    field_key: str,
    raw_value: Any,
    tokens: List[Dict[str, Any]],
    field_type: str = "text"
) -> Dict[str, Any]:
    """
    Locates raw_value in tokens, extracts bounding box and page, and formats normalizedValue.
    """
    if raw_value is None:
        return {
            "rawText": None,
            "normalizedValue": None,
            "page": 1,
            "boundingBox": None,
            "confidence": 0.0,
            "source": "not-found",
            "isLocated": False,
            "disagreement": None
        }

    str_val = str(raw_value).strip()
    is_located, bbox, page = locate_phrase_in_tokens(str_val, tokens)

    # Normalize value based on field type
    normalized = raw_value
    if field_type == "paise" or "amount" in field_key.lower() or "total" in field_key.lower():
        normalized = to_paise(raw_value)
    elif field_type == "gstin":
        normalized = str_val.upper().replace(" ", "")

    return {
        "rawText": str_val,
        "normalizedValue": normalized,
        "page": page,
        "boundingBox": bbox,
        "confidence": 0.95 if is_located else 0.70,
        "source": "text-layer" if is_located else "llm-mapped",
        "isLocated": is_located,
        "disagreement": None if is_located else {
            "candidateA": str_val,
            "candidateB": "Unlocated in document text layer",
            "reason": "Value was inferred or mapped by LLM but not located verbatim in PDF text layer."
        }
    }

def bind_invoice_references(raw_invoice: Dict[str, Any], text_layer_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches all invoice fields with exact bounding boxes, page indices, and integer paise amounts.
    """
    # Flatten all tokens across all pages
    all_tokens = []
    for p in text_layer_data.get("pages", []):
        all_tokens.extend(p.get("tokens", []))

    # Top-level particulars
    invoice_details = {
        "invoiceNumber": bind_field_reference("invoiceNumber", raw_invoice.get("invoiceNumber"), all_tokens),
        "invoiceDate": bind_field_reference("invoiceDate", raw_invoice.get("invoiceDate"), all_tokens, "date"),
        "dueDate": bind_field_reference("dueDate", raw_invoice.get("dueDate"), all_tokens, "date"),
        "placeOfSupply": bind_field_reference("placeOfSupply", raw_invoice.get("placeOfSupply"), all_tokens),
    }

    counter_party = {
        "supplierName": bind_field_reference("supplierName", raw_invoice.get("supplierName"), all_tokens),
        "supplierGstin": bind_field_reference("supplierGstin", raw_invoice.get("supplierGstin"), all_tokens, "gstin"),
        "supplierAddress": bind_field_reference("supplierAddress", raw_invoice.get("supplierAddress"), all_tokens),
        "customerName": bind_field_reference("customerName", raw_invoice.get("customerName"), all_tokens),
        "customerGstin": bind_field_reference("customerGstin", raw_invoice.get("customerGstin"), all_tokens, "gstin"),
    }

    # Line items
    bound_line_items = []
    for item in raw_invoice.get("lineItems", []):
        desc = item.get("description", "")
        taxable_amt = item.get("taxableAmount", 0)
        
        bound_item = {
            "description": bind_field_reference("description", desc, all_tokens),
            "hsnCode": bind_field_reference("hsnCode", item.get("hsnCode"), all_tokens),
            "quantity": item.get("quantity", 1),
            "unit": item.get("unit", "NOS"),
            "ratePaise": to_paise(item.get("rate", 0)),
            "taxableAmountPaise": to_paise(taxable_amt),
            "gstRateBasisPoints": int(float(item.get("gstRate", 18)) * 100),
            "cgstPaise": to_paise(item.get("cgstAmount", 0)),
            "sgstPaise": to_paise(item.get("sgstAmount", 0)),
            "igstPaise": to_paise(item.get("igstAmount", 0)),
            "cessPaise": to_paise(item.get("cessAmount", 0)),
            "totalAmountPaise": to_paise(item.get("totalAmount", 0)),
            "page": 1,
            "boundingBox": None,
            "isLocated": True
        }

        # Try to locate line item on page
        is_loc, bbox, page = locate_phrase_in_tokens(desc, all_tokens)
        if is_loc:
            bound_item["boundingBox"] = bbox
            bound_item["page"] = page
            bound_item["isLocated"] = True
        else:
            bound_item["isLocated"] = False

        bound_line_items.append(bound_item)

    # Financial Summary in Integer Paise
    financial_summary = {
        "subTotalPaise": to_paise(raw_invoice.get("subTotal", 0)),
        "totalCgstPaise": to_paise(raw_invoice.get("totalCgst", 0)),
        "totalSgstPaise": to_paise(raw_invoice.get("totalSgst", 0)),
        "totalIgstPaise": to_paise(raw_invoice.get("totalIgst", 0)),
        "totalCessPaise": to_paise(raw_invoice.get("totalCess", 0)),
        "roundOffPaise": to_paise(raw_invoice.get("roundOff", 0)),
        "grandTotalPaise": to_paise(raw_invoice.get("grandTotal", 0)),
    }

    # Bounding boxes for grand totals
    gt_str = str(raw_invoice.get("grandTotal", ""))
    is_loc_gt, bbox_gt, page_gt = locate_phrase_in_tokens(gt_str, all_tokens)
    financial_summary["grandTotalEvidence"] = {
        "isLocated": is_loc_gt,
        "boundingBox": bbox_gt,
        "page": page_gt
    }

    return {
        "invoiceDetails": invoice_details,
        "counterParty": counter_party,
        "lineItems": bound_line_items,
        "financialSummary": financial_summary,
        "pages": text_layer_data.get("pages", []),
        "hasTextLayer": text_layer_data.get("hasTextLayer", True),
        "totalTokens": text_layer_data.get("totalTokens", 0)
    }

