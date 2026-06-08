"""
app/services/image_store.py
===========================
Optional image storage for scan history.
Uses the Cloudinary free tier (25GB storage, 25GB bandwidth/month).
Falls back to NOT storing (returns None) if credentials are missing or the
cloudinary package is not installed — so the app never breaks without it.

Get a free account (no credit card): https://cloudinary.com/users/register/free
"""

import os

try:
    import cloudinary
    import cloudinary.uploader
    _CLOUDINARY_OK = True
except Exception:  # pragma: no cover - optional dependency
    _CLOUDINARY_OK = False

_configured = False


def _ensure_configured() -> bool:
    """Configure cloudinary once. Returns True if usable."""
    global _configured
    if not _CLOUDINARY_OK:
        return False
    if not os.getenv("CLOUDINARY_CLOUD_NAME"):
        return False
    if not _configured:
        cloudinary.config(
            cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key    = os.getenv("CLOUDINARY_API_KEY"),
            api_secret = os.getenv("CLOUDINARY_API_SECRET"),
            secure     = True,
        )
        _configured = True
    return True


def upload_scan_image(base64_image: str, scan_id: str) -> str | None:
    """Upload a label image and return its CDN URL. Returns None if disabled."""
    if not _ensure_configured():
        return None
    try:
        result = cloudinary.uploader.upload(
            f"data:image/jpeg;base64,{base64_image}",
            public_id    = f"scans/{scan_id}",
            folder       = "labelpadhega",
            overwrite    = True,
            quality      = "auto",
            fetch_format = "auto",
        )
        return result.get("secure_url")
    except Exception:
        return None
