"""
app/routes/profile.py
=====================
GET /api/profile        — fetch authenticated user profile
POST /api/profile       — create profile (called after signup)
PUT /api/profile        — update profile fields
GET /api/profile/bmi    — compute BMI via calculate_bmi tool
"""
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.user import UserProfile
from app.tools.bmi_tool import calculate_bmi
from app.utils.auth import jwt_required, get_current_user

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("", methods=["GET"])
@jwt_required
def get_profile():
    user = get_current_user()
    if not user or not user.profile:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(user.profile.to_dict()), 200

@profile_bp.route("", methods=["POST", "PUT"])
@jwt_required
def upsert_profile():
    """Create or update user profile."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data    = request.get_json(silent=True) or {}
    profile = user.profile or UserProfile(user_id=user.id)

    # Update allowed fields
    if "age"            in data: profile.age           = data["age"]
    if "height_cm"      in data: profile.height_cm     = data["height_cm"]
    if "weight_kg"      in data: profile.weight_kg     = data["weight_kg"]
    if "diet_type"      in data: profile.diet_type      = data["diet_type"]
    if "activity_level" in data: profile.activity_level = data["activity_level"]
    if "theme"          in data: profile.theme          = data["theme"]
    if "preferred_language" in data: profile.preferred_language = data["preferred_language"]

    if "conditions" in data:
        conds = data["conditions"]
        profile.conditions = ",".join(conds) if isinstance(conds, list) else conds
    if "allergies"  in data:
        alls = data["allergies"]
        profile.allergies  = ",".join(alls) if isinstance(alls, list) else alls

    # Auto-calculate BMI if height and weight provided
    if profile.height_cm and profile.weight_kg:
        bmi_result = calculate_bmi(profile.height_cm, profile.weight_kg)
        profile.bmi                 = bmi_result.get("bmi")
        profile.bmi_category_indian = bmi_result.get("indian_category")

    db.session.add(profile)
    db.session.commit()
    return jsonify(profile.to_dict()), 200

@profile_bp.route("/bmi", methods=["GET"])
@jwt_required
def get_bmi():
    """Compute BMI from query params. Uses calculate_bmi tool."""
    height = request.args.get("height_cm", type=float)
    weight = request.args.get("weight_kg", type=float)
    if not height or not weight:
        return jsonify({"error": "height_cm and weight_kg are required"}), 400
    return jsonify(calculate_bmi(height, weight)), 200
