"""
app/routes/product.py
=====================
GET    /api/product/<barcode>        — full product data
GET    /api/product/history          — paginated scan history
DELETE /api/product/history/<scan_id> — delete a scan record
"""
from flask import Blueprint, jsonify, g
from flask import request as req
from app.models.product import Product
from app.models.scan import Scan
from app import db
from app.utils.auth import jwt_required, jwt_optional

product_bp = Blueprint("product", __name__)


@product_bp.route("/history", methods=["GET"])
@jwt_required
def scan_history():
    """
    Return up to 100 scan records for the authenticated user.
    Supports optional ?limit=N query param (max 200).
    Response shape: { scans: [...], total: N }
    """
    try:
        limit = min(int(req.args.get("limit", 100)), 200)
    except (TypeError, ValueError):
        limit = 100

    scans = (
        Scan.query
        .filter_by(user_id=g.user_id)
        .order_by(Scan.created_at.desc())
        .limit(limit)
        .all()
    )
    serialised = [s.to_dict() for s in scans]
    return jsonify({"scans": serialised, "total": len(serialised)}), 200


@product_bp.route("/history/<scan_id>", methods=["DELETE"])
@jwt_required
def delete_scan(scan_id):
    """Delete a scan record. Only the owner can delete their own scans."""
    scan = Scan.query.filter_by(id=scan_id, user_id=g.user_id).first()
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    try:
        db.session.delete(scan)
        db.session.commit()
        return jsonify({"deleted": scan_id}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Delete failed"}), 500


@product_bp.route("/<barcode>", methods=["GET"])
@jwt_optional
def get_product(barcode):
    """Return full cached product data including score and verdict."""
    product = Product.query.get(barcode)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.to_dict()), 200
