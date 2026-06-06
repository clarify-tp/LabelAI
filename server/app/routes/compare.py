"""
app/routes/compare.py
=====================
POST /api/compare
Compare 2-4 already-scanned products.
Uses the compare_products tool — LLM never picks the winner directly.
Results cached for 30 days in comparison_cache table.
"""
import json
import hashlib
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.product import Product
from app.models.cache import ComparisonCache
from app.services.groq_service import generate_comparison_verdict
from app.utils.auth import jwt_optional

compare_bp = Blueprint("compare", __name__)

@compare_bp.route("", methods=["POST"])
@jwt_optional
def compare():
    data     = request.get_json(silent=True) or {}
    barcodes = data.get("barcodes") or []

    if len(barcodes) < 2 or len(barcodes) > 4:
        return jsonify({"error": "Provide 2-4 barcodes to compare"}), 400

    # Sort for consistent cache key
    sorted_barcodes = sorted(str(b) for b in barcodes)
    cache_key = hashlib.md5("_".join(sorted_barcodes).encode()).hexdigest()

    # Check cache
    cached = ComparisonCache.query.get(cache_key)
    if cached and not cached.is_expired():
        return jsonify({
            "status":     "OK",
            "from_cache": True,
            "result":     json.loads(cached.result_json or "{}"),
            "verdict_text": cached.verdict_text,
            "winner_barcode": cached.winner_barcode,
        }), 200

    # Fetch all products
    products = []
    for bc in sorted_barcodes:
        p = Product.query.get(bc)
        if not p:
            return jsonify({"error": f"Product {bc} not found. Scan it first."}), 404
        products.append(p.to_dict())

    # Generate comparison via tool + Groq verdict
    result = generate_comparison_verdict(products)
    comparison = result["comparison_result"]
    verdict    = result["verdict_text"]

    # Cache result
    try:
        entry = ComparisonCache(
            cache_key      = cache_key,
            barcodes       = ",".join(sorted_barcodes),
            verdict_text   = verdict,
            winner_barcode = comparison.get("winner_barcode"),
            result_json    = json.dumps(comparison, ensure_ascii=False),
        )
        db.session.merge(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({
        "status":         "OK",
        "from_cache":     False,
        "result":         comparison,
        "verdict_text":   verdict,
        "winner_barcode": comparison.get("winner_barcode"),
    }), 200
