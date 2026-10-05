"""
Authentication and authorization middleware for FoodBridge AI.
"""
import jwt
from functools import wraps
from flask import request, jsonify, g
from config import Config
from db import db
from bson import ObjectId


def token_required(f):
    """Decorator: requires a valid JWT in the Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization token is required"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token. Please log in again."}), 401

        user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user or user.get("status") != "active":
            return jsonify({"error": "User not found or account inactive"}), 401

        g.user = user
        g.user_id = str(user["_id"])
        g.role = user["role"]
        return f(*args, **kwargs)

    return decorated


def role_required(*roles):
    """Decorator: requires the authenticated user to have one of the given roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, "role") or g.role not in roles:
                return jsonify({"error": "Insufficient permissions for this action"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
