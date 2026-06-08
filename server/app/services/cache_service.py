"""
app/services/cache_service.py
=============================
Redis cache for scan results. Falls back gracefully if Redis is unavailable
(the whole module is a no-op when REDIS_URL is unset or unreachable, so the
app keeps working without Redis installed).

Use the Upstash Redis free tier (10K commands/day, no credit card) or a local
Redis via Docker:  docker run -p 6379:6379 redis:alpine
"""

import os
import json
import hashlib

try:
    import redis  # type: ignore
    _REDIS_LIB_OK = True
except Exception:  # pragma: no cover - optional dependency
    _REDIS_LIB_OK = False

_redis = None
_redis_init_done = False


def get_redis():
    """Lazily create a Redis client. Returns None if unavailable."""
    global _redis, _redis_init_done
    if _redis_init_done:
        return _redis
    _redis_init_done = True

    if not _REDIS_LIB_OK:
        return None
    url = os.getenv("REDIS_URL")
    if not url:
        return None
    try:
        client = redis.from_url(url, decode_responses=True, socket_timeout=1)
        client.ping()
        _redis = client
    except Exception:
        _redis = None
    return _redis


def cache_key(image_b64: str) -> str:
    """Deterministic key from an image hash (uses the full payload)."""
    digest = hashlib.sha256(image_b64.encode()).hexdigest()[:32]
    return f"scan:v1:{digest}"


def get_cached_scan(image_b64: str) -> dict | None:
    r = get_redis()
    if not r:
        return None
    try:
        val = r.get(cache_key(image_b64))
        return json.loads(val) if val else None
    except Exception:
        return None


def cache_scan(image_b64: str, result: dict, ttl_seconds: int = 86400) -> None:
    """Cache a scan result for 24 hours by default."""
    r = get_redis()
    if not r:
        return
    try:
        r.setex(cache_key(image_b64), ttl_seconds, json.dumps(result, ensure_ascii=False))
    except Exception:
        pass
