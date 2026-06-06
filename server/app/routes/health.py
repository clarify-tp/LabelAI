"""
app/routes/health.py
====================
Health check endpoint — GET /api/health
Used by UptimeRobot to keep Render.com free tier from sleeping.
Returns DB connectivity status + app version.
"""
from flask import Blueprint, jsonify
from datetime import datetime, timezone
from app import db

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check route.
    Ping this every 10 minutes via UptimeRobot to prevent Render cold starts.
    """
    db_ok = True
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_ok = False

    return jsonify({
        "status":    "ok" if db_ok else "degraded",
        "db":        "connected" if db_ok else "error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version":   "1.0.0",
        "app":       "Label Padhega AI",
    }), 200 if db_ok else 503
