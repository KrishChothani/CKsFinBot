# app/services/text_layer_extractor.py
"""
Text Layer and Word Coordinate Extraction Engine.

FINTECH PRINCIPLE: Extract by reference.
Extracts word tokens with exact bounding boxes [x0, y0, x1, y1] directly from the PDF text layer.
Normalizes coordinates to a 0-1000 coordinate space for device-independent, responsive UI rendering.
"""

import pymupdf as fitz
from typing import Dict, Any, List, Tuple

def extract_pdf_text_layer(doc_path_or_bytes: Any) -> Dict[str, Any]:
    """
    Extracts text layer word tokens, pages, and bounding boxes using PyMuPDF.
    
    Returns:
    {
        "hasTextLayer": bool,
        "pageCount": int,
        "pages": [
            {
                "pageNumber": int,
                "width": float,
                "height": float,
                "tokens": [
                    {
                        "tokenId": str,
                        "text": str,
                        "page": int,
                        "bbox": [x0, y0, x1, y1], # absolute points
                        "normBbox": [nx0, ny0, nx1, ny1] # 0-1000 normalized space
                    }
                ],
                "fullText": str
            }
        ]
    }
    """
    if isinstance(doc_path_or_bytes, bytes):
        doc = fitz.open(stream=doc_path_or_bytes, filetype="pdf")
    else:
        doc = fitz.open(doc_path_or_bytes)

    page_count = len(doc)
    pages_data = []
    total_tokens = 0

    for page_idx in range(page_count):
        page = doc[page_idx]
        page_num = page_idx + 1
        rect = page.rect
        width = float(rect.width)
        height = float(rect.height)

        # page.get_text("words") returns tuples: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
        raw_words = page.get_text("words")
        tokens = []

        for w_idx, w in enumerate(raw_words):
            x0, y0, x1, y1, word_text = float(w[0]), float(w[1]), float(w[2]), float(w[3]), str(w[4])
            
            # Normalize to 0-1000 grid for responsive SVG overlays
            nx0 = round((x0 / width) * 1000, 1) if width > 0 else 0
            ny0 = round((y0 / height) * 1000, 1) if height > 0 else 0
            nx1 = round((x1 / width) * 1000, 1) if width > 0 else 1000
            ny1 = round((y1 / height) * 1000, 1) if height > 0 else 1000

            token_id = f"p{page_num}_w{w_idx}"
            tokens.append({
                "tokenId": token_id,
                "text": word_text,
                "page": page_num,
                "bbox": [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                "normBbox": [nx0, ny0, nx1, ny1]
            })

        total_tokens += len(tokens)
        full_text = page.get_text("text")

        pages_data.append({
            "pageNumber": page_num,
            "width": width,
            "height": height,
            "tokens": tokens,
            "fullText": full_text
        })

    doc.close()

    # If document has fewer than 15 total words across all pages, consider it a scan without a text layer
    has_text_layer = total_tokens >= 15

    return {
        "hasTextLayer": has_text_layer,
        "pageCount": page_count,
        "totalTokens": total_tokens,
        "pages": pages_data
    }

def locate_phrase_in_tokens(phrase: str, tokens: List[Dict[str, Any]]) -> Tuple[bool, List[float], int]:
    """
    Finds the bounding box encompassing an extracted phrase or number within word tokens.
    Returns: (isLocated, [x0, y0, x1, y1], page)
    """
    if not phrase or not tokens:
        return False, None, 1

    clean_phrase = "".join(phrase.split()).lower()
    if not clean_phrase:
        return False, None, 1

    # Single-word exact search first
    for tok in tokens:
        clean_tok = "".join(tok["text"].split()).lower()
        if clean_phrase == clean_tok or clean_phrase in clean_tok:
            return True, tok["normBbox"], tok["page"]

    # Multi-word sliding window search
    words = phrase.split()
    if len(words) > 1:
        first_clean = "".join(words[0].split()).lower()
        for i in range(len(tokens) - len(words) + 1):
            if first_clean in tokens[i]["text"].lower():
                # Check consecutive words
                matched = True
                for j in range(1, len(words)):
                    if "".join(words[j].split()).lower() not in tokens[i + j]["text"].lower():
                        matched = False
                        break
                if matched:
                    # Union bounding box of the matching tokens
                    matched_toks = tokens[i : i + len(words)]
                    page = matched_toks[0]["page"]
                    min_x = min(t["normBbox"][0] for t in matched_toks)
                    min_y = min(t["normBbox"][1] for t in matched_toks)
                    max_x = max(t["normBbox"][2] for t in matched_toks)
                    max_y = max(t["normBbox"][3] for t in matched_toks)
                    return True, [min_x, min_y, max_x, max_y], page

    # Not found in text layer
    return False, None, 1

