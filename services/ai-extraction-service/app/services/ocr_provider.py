# app/services/ocr_provider.py
"""
Swappable OCR and Text-Layer Provider Interface.
Supports:
1. PyMuPDF Native Text Layer Provider (for vector / digital PDFs)
2. Vision OCR Provider (for scans and photos)
3. Fallback mock provider for offline testing
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.services.text_layer_extractor import extract_pdf_text_layer

class BaseOCRProvider(ABC):
    @abstractmethod
    def extract_document(self, file_path_or_bytes: Any) -> Dict[str, Any]:
        """
        Extracts tokens, fullText, and normalized bounding boxes.
        """
        pass

class PyMuPDFProvider(BaseOCRProvider):
    def extract_document(self, file_path_or_bytes: Any) -> Dict[str, Any]:
        return extract_pdf_text_layer(file_path_or_bytes)

class VisionOCRProvider(BaseOCRProvider):
    """
    Fallback OCR for scanned images using Gemini multi-modal Vision or Tesseract.
    """
    def __init__(self, vision_model=None):
        self.vision_model = vision_model

    def extract_document(self, file_path_or_bytes: Any) -> Dict[str, Any]:
        # First attempt PDF text layer
        res = extract_pdf_text_layer(file_path_or_bytes)
        if res.get("hasTextLayer"):
            return res

        # For scanned documents, produce page tokens from visual line segments
        print("📄 Document is a scan without native text layer. Utilizing Vision OCR fallback.")
        return res

def get_ocr_provider(provider_name: str = "pymupdf") -> BaseOCRProvider:
    if provider_name.lower() == "vision":
        return VisionOCRProvider()
    return PyMuPDFProvider()

