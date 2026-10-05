"""
FoodBridge AI — Authentication routes
--------------------------------------
POST /api/auth/register   – Create a new user account
POST /api/auth/login      – Authenticate and return JWT
GET  /api/auth/me         – Return current user (requires token)
PUT  /api/auth/profile    – Update profile fields (requires token)
"""
from flask import Blueprint, request, jsonify, g
import bcrypt
import jwt
import datetime
from config import Config
from db import db
from middleware import token_required
from bson import ObjectId

auth_bp = Blueprint("auth", __name__)

ALLOWED_ROLES = {"donor", "ngo", "volunteer", "admin"}


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email", "") or "").strip().lower()
    password = data.get("password", "") or ""
    role     = data.get("role", "") or ""
    name     = (data.get("name", "") or "").strip()
    org_name = (data.get("org_name", "") or "").strip()
    phone    = (data.get("phone", "") or "").strip()
    address  = (data.get("address", "") or "").strip()

    # Validation
    if not all([email, password, role, name]):
        return jsonify({"error": "name, email, password and role are required"}), 400

    if role not in ALLOWED_ROLES:
        return jsonify({"error": f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Invalid email address"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"error": "An account with this email already exists"}), 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user_doc = {
        "email":      email,
        "password":   hashed,
        "role":       role,
        "name":       name,
        "org_name":   org_name,
        "phone":      phone,
        "address":    address,
        "status":     "active",
        "verified":   False,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow(),
    }

    result = db.users.insert_one(user_doc)
    return jsonify({
        "message": "Account created successfully",
        "user_id": str(result.inserted_id),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email", "") or "").strip().lower()
    password = data.get("password", "") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = db.users.find_one({"email": email})

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    if user.get("status") != "active":
        return jsonify({"error": "Your account is suspended. Contact support."}), 403

    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    token = jwt.encode(
        {"user_id": str(user["_id"]), "role": user["role"], "exp": exp},
        Config.JWT_SECRET,
        algorithm="HS256",
    )

    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user": {
            "id":       str(user["_id"]),
            "email":    user["email"],
            "role":     user["role"],
            "name":     user["name"],
            "org_name": user.get("org_name", ""),
            "phone":    user.get("phone", ""),
            "address":  user.get("address", ""),
            "verified": user.get("verified", False),
        },
    }), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    u = g.user
    return jsonify({
        "id":       str(u["_id"]),
        "email":    u["email"],
        "role":     u["role"],
        "name":     u["name"],
        "org_name": u.get("org_name", ""),
        "phone":    u.get("phone", ""),
        "address":  u.get("address", ""),
        "verified": u.get("verified", False),
        "created_at": u.get("created_at", "").isoformat() if u.get("created_at") else "",
    }), 200


@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json(silent=True) or {}
    allowed = {"name", "org_name", "phone", "address"}
    updates = {k: v for k, v in data.items() if k in allowed and isinstance(v, str)}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    updates["updated_at"] = datetime.datetime.utcnow()
    db.users.update_one({"_id": g.user["_id"]}, {"$set": updates})
    return jsonify({"message": "Profile updated successfully"}), 200
