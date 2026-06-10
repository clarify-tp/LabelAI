"""
app/services/paddle_ocr_service.py
====================================
PaddleOCR-based pre-extraction layer.

Strategy:
  1. Decode the base64 image.
  2. Run PaddleOCR to get raw text blocks (with confidence scores).
  3. Return the concatenated text + per-block confidence so Groq can parse
     structured data from clean text instead of a raw image.

Why this helps:
  - PaddleOCR is specifically tuned for dense text extraction on product labels
    (small fonts, mixed scripts, tight layouts).
  - Groq Vision sometimes misreads fine print.  Giving Groq the OCR'd text as
    an explicit input significantly reduces hallucination.
  - Confidence scores let us skip unreliable blocks and flag LOW confidence.

Degrades gracefully: if paddleocr is not installed, the module still imports
and `extract_text_from_image()` returns None so the caller falls back to
pure-vision mode unchanged.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Optional PaddleOCR import — degrades gracefully ──────────────────────────
try:
    from paddleocr import PaddleOCR
    _paddle_available = True
    logger.info("[paddle_ocr] PaddleOCR available ✓")
except Exception:  # pragma: no cover
    _paddle_available = False
    logger.warning("[paddle_ocr] PaddleOCR not installed — falling back to Groq Vision only")

# ── Optional Pillow — used for pre-processing before PaddleOCR ───────────────
try:
    from PIL import Image, ImageEnhance, ImageFilter
    _pil_available = True
except Exception:  # pragma: no cover
    _pil_available = False

# ── Lazy singleton — one PaddleOCR instance per process ─────────────────────
_ocr_instance: Optional["PaddleOCR"] = None  # type: ignore[name-defined]

_MIN_CONFIDENCE = 0.65   # discard blocks below this score
_OVERALL_LOW_THRESHOLD = 0.72  # if mean confidence < this → flag as LOW


def _get_ocr() -> Optional["PaddleOCR"]:  # type: ignore[name-defined]
    """Return (or create) the shared PaddleOCR instance."""
    global _ocr_instance
    if not _paddle_available:
        return None
    if _ocr_instance is None:
        try:
            # use_angle_cls=True handles rotated/tilted labels
            # lang='en' handles Indian-English ingredient lists well
            # show_log=False keeps the console quiet
            _ocr_instance = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=False,   # CPU-only for broad compatibility
            )
        except Exception as exc:
            logger.error("[paddle_ocr] Failed to init PaddleOCR: %s", exc)
            return None
    return _ocr_instance


def _preprocess_for_paddle(raw_bytes: bytes) -> bytes:
    """
    Upscale + sharpen the image before PaddleOCR.

    PaddleOCR performs better on images where fine print is at least 20px tall.
    Steps:
      - Convert to RGB
      - Upscale if shortest side < 1200px  (label fine print optimum)
      - Cap at 3000px on longest side
      - Sharpen x2, Contrast x1.4
    """
    if not _pil_available:
        return raw_bytes
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        short = min(w, h)
        long  = max(w, h)
        if short < 1200:
            scale = 1200 / short
            img   = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            w, h  = img.size
            long  = max(w, h)
        if long > 3000:
            scale = 3000 / long
            img   = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        img = ImageEnhance.Contrast(img).enhance(1.4)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except Exception:
        return raw_bytes


class PaddleOCRResult:
    """Holds extracted text + metadata."""

    def __init__(self, text: str, confidence: float, blocks: list[dict]):
        self.text       = text        # full concatenated text
        self.confidence = confidence  # mean confidence across accepted blocks
        self.blocks     = blocks      # [{text, confidence}]

    @property
    def ocr_confidence_label(self) -> str:
        if self.confidence >= _OVERALL_LOW_THRESHOLD and len(self.text) > 30:
            return "HIGH"
        if self.confidence >= 0.55 and len(self.text) > 10:
            return "MEDIUM"
        return "LOW"

    def __bool__(self) -> bool:
        return bool(self.text.strip())


def extract_text_from_image(base64_image: str) -> Optional[PaddleOCRResult]:
    """
    Run PaddleOCR on a base64-encoded image.

    Returns a PaddleOCRResult if successful, None if PaddleOCR is unavailable
    or the image cannot be decoded.
    """
    ocr = _get_ocr()
    if ocr is None:
        return None

    try:
        raw = base64.b64decode(base64_image)
    except Exception:
        logger.warning("[paddle_ocr] Could not decode base64 image")
        return None

    raw = _preprocess_for_paddle(raw)

    try:
        # PaddleOCR accepts a numpy array or a file path; we use numpy via PIL
        import numpy as np
        img_arr = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
        result  = ocr.ocr(img_arr, cls=True)
    except Exception as exc:
        logger.error("[paddle_ocr] OCR run failed: %s", exc)
        return None

    if not result or not result[0]:
        return PaddleOCRResult(text="", confidence=0.0, blocks=[])

    accepted_blocks: list[dict] = []
    confidences: list[float]    = []

    for page in result:
        if not page:
            continue
        for line in page:
            # PaddleOCR output: [[box_points], (text, confidence)]
            try:
                text_conf = line[1]
                text, conf = text_conf[0], float(text_conf[1])
            except (IndexError, TypeError, ValueError):
                continue
            if conf >= _MIN_CONFIDENCE and text.strip():
                accepted_blocks.append({"text": text.strip(), "confidence": round(conf, 3)})
                confidences.append(conf)

    if not accepted_blocks:
        return PaddleOCRResult(text="", confidence=0.0, blocks=[])

    mean_conf = sum(confidences) / len(confidences)
    full_text = "\n".join(b["text"] for b in accepted_blocks)

    logger.info(
        "[paddle_ocr] Extracted %d blocks, mean confidence=%.2f, chars=%d",
        len(accepted_blocks), mean_conf, len(full_text),
    )
    return PaddleOCRResult(text=full_text, confidence=mean_conf, blocks=accepted_blocks)
