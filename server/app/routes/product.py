"""
app/routes/product.py
=====================
GET /api/product/<barcode>   — full product data
GET /api/product/history     — last 20 scans for authenticated user
"""
from flask import Blueprint, jsonify, g
from app.models.product import Product
from app.models.scan import Scan
from app.utils.auth import jwt_required, jwt_optional

product_bp = Blueprint("product", __name__)

@product_bp.route("/history", methods=["GET"])
@jwt_required
def scan_history():
    """Return last 20 scan records for the authenticated user."""
    scans = (
        Scan.query
        .filter_by(user_id=g.user_id)
        .order_by(Scan.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify({"scans": [s.to_dict() for s in scans]}), 200

@product_bp.route("/<barcode>", methods=["GET"])
@jwt_optional
def get_product(barcode):
    """Return full cached product data including score and verdict."""
    product = Product.query.get(barcode)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.to_dict()), 200
