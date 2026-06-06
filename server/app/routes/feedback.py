"""
app/routes/feedback.py
======================
POST /api/feedback/ingredient — log unknown ingredient for manual review
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.ingredient import UnknownIngredient

feedback_bp = Blueprint("feedback", __name__)

@feedback_bp.route("/ingredient", methods=["POST"])
def log_ingredient():
    data    = request.get_json(silent=True) or {}
    name    = (data.get("name") or "").strip()[:255]
    barcode = data.get("product_barcode", "")

    if not name:
        return jsonify({"error": "Ingredient name required"}), 400

    existing = UnknownIngredient.query.filter_by(name_as_found=name).first()
    if existing:
        existing.scan_count += 1
    else:
        db.session.add(UnknownIngredient(name_as_found=name, product_barcode=barcode))
    db.session.commit()

    return jsonify({"message": "Logged", "name": name}), 200
