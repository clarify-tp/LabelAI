"""
app/utils/auth.py
=================
JWT authentication helpers for Flask routes.

We issue our own JWTs (using python-jose) on login.
This keeps the backend self-contained without depending
on Supabase Auth infrastructure.

Usage in route:
    from app.utils.auth import jwt_required, get_current_user

    @bp.route("/protected")
    @jwt_required
    def protected():
        user = get_current_user()
        return jsonify(user.to_dict())
"""

import os
import functools
from datetime import datetime, timezone, timedelta
from flask import request, jsonify, g
from jose import jwt, JWTError

SECRET_KEY  = os.getenv("SECRET_KEY", "dev-secret")
ALGORITHM   = "HS256"
TOKEN_EXPIRY = 60 * 24 * 7   # 7 days in minutes


def create_access_token(user_id: str) -> str:
    """Create a signed JWT for the given user_id."""
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRY),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises JWTError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def jwt_required(f):
    """
    Decorator: validates Bearer token in Authorization header.
    Sets g.user_id on success. Returns 401 on failure.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            g.user_id = payload["sub"]
        except JWTError as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        return f(*args, **kwargs)
    return decorated


def jwt_optional(f):
    """
    Decorator: tries to decode JWT but does not fail if missing.
    Sets g.user_id to None for anonymous requests.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        g.user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = decode_token(token)
                g.user_id = payload["sub"]
            except JWTError:
                pass   # anonymous — fine
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    """
    Fetch the User model for g.user_id.
    Call only inside a jwt_required decorated route.
    """
    from app.models.user import User
    if not g.user_id:
        return None
    return User.query.get(g.user_id)
