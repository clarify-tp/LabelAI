"""
app/routes/auth.py
==================
Authentication endpoints.

POST /api/auth/register  — create account + profile skeleton
POST /api/auth/login     — verify credentials, return JWT
POST /api/auth/logout    — client-side token discard (stateless)
GET  /api/auth/me        — return current user from JWT

JWT tokens are issued here using python-jose.
Passwords are hashed with bcrypt.
The token is stored by the React frontend in localStorage
and sent as Authorization: Bearer <token> on every request.
"""

from flask import Blueprint, request, jsonify, g
import bcrypt
from app import db
from app.models.user import User, UserProfile
from app.utils.auth import create_access_token, jwt_required, get_current_user
from app.utils.email import send_welcome_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Create a new user account.
    Body: { email, password, first_name? }
    Returns: { user, token }
    """
    data = request.get_json(silent=True) or {}
    email      = (data.get("email") or "").strip().lower()
    password   = data.get("password") or ""
    first_name = (data.get("first_name") or "").strip()

    # ── Validation ─────────────────────────────────────────────────────────────
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    # ── Create user ────────────────────────────────────────────────────────────
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(email=email, password=hashed, first_name=first_name or None)
    db.session.add(user)
    db.session.flush()   # get user.id before commit

    # Create empty profile skeleton
    profile = UserProfile(user_id=user.id)
    db.session.add(profile)
    db.session.commit()

    # Send welcome email via Brevo (non-blocking — ignore failure)
    try:
        send_welcome_email(email, first_name or "there")
    except Exception:
        pass   # email failure should never break registration

    token = create_access_token(user.id)
    return jsonify({"user": user.to_dict(), "token": token}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return JWT.
    Body: { email, password }
    Returns: { user, token, profile }
    """
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode(), user.password.encode()):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    token = create_access_token(user.id)
    profile = user.profile.to_dict() if user.profile else None

    return jsonify({
        "user":    user.to_dict(),
        "profile": profile,
        "token":   token,
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required
def logout():
    """
    Logout is handled client-side by discarding the JWT.
    This endpoint exists for API completeness and future token blacklisting.
    """
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required
def me():
    """Return current authenticated user + profile."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user":    user.to_dict(),
        "profile": user.profile.to_dict() if user.profile else None,
    }), 200
