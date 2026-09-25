"""OCR adapter. A scanned page is never filled with invented text."""

from app.config import settings


class OcrUnavailable(Exception):
    """The file has no text layer and OCR cannot produce a verified transcript."""


def extract_text(data: bytes) -> str:
    if not settings.ocr_enabled:
        raise OcrUnavailable("INSUFFICIENT_SOURCE")
    provider = (settings.ocr_provider or "").lower()
    if provider not in {"tesseract", "paddleocr"}:
        raise OcrUnavailable("INSUFFICIENT_SOURCE")
    try:
        if provider == "tesseract":
            return _tesseract(data)
    except Exception as exc:
        raise OcrUnavailable("INSUFFICIENT_SOURCE") from exc
    raise OcrUnavailable("INSUFFICIENT_SOURCE")


def _tesseract(data: bytes) -> str:
    raise OcrUnavailable("INSUFFICIENT_SOURCE")
