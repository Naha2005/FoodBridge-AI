"""
FoodBridge AI — Admin routes
-------------------------------
GET  /api/admin/stats                  – Platform-wide counts
GET  /api/admin/users                  – List all users
PUT  /api/admin/users/<id>/role        – Change a user's role
PUT  /api/admin/users/<id>/verify      – Verify / unverify an NGO
GET  /api/admin/donations              – List all donations (any status)

All endpoints require admin role.
"""
import datetime
from flask import Blueprint, request, jsonify, g
from db import db
from middleware import token_required, role_required
from bson import ObjectId

admin_bp = Blueprint("admin", __name__)

VALID_ROLES = {"donor", "ngo", "volunteer", "admin"}


def _serialize_user(doc):
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password", None)          # never expose password hash
    for k in ("created_at", "updated_at"):
        if k in doc and isinstance(doc[k], datetime.datetime):
            doc[k] = doc[k].isoformat()
    return doc


def _serialize_donation(doc):
    doc["id"] = str(doc.pop("_id"))
    for k in ("created_at", "updated_at", "expiry_time", "prep_time",
              "collection_deadline", "accepted_at", "picked_up_at", "delivered_at"):
        if k in doc and isinstance(doc[k], datetime.datetime):
            doc[k] = doc[k].isoformat()
    if "donor_id" in doc:
        doc["donor_id"] = str(doc["donor_id"])
    if "matched_ngo_id" in doc and doc["matched_ngo_id"]:
        doc["matched_ngo_id"] = str(doc["matched_ngo_id"])
    return doc


@admin_bp.route("/stats", methods=["GET"])
@token_required
@role_required("admin")
def admin_stats():
    total_users = db.users.count_documents({})

    pipeline = db.food_listings.aggregate([
        {"$group": {
            "_id": None,
            "total_donations": {"$sum": 1},
            "delivered":       {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
            "delivered_qty":   {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, "$quantity", 0]}},
            "available":       {"$sum": {"$cond": [{"$eq": ["$status", "available"]}, 1, 0]}},
            "cancelled":       {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}},
        }}
    ])
    totals = next(pipeline, {})
    totals.pop("_id", None)

    return jsonify({
        "total_users":      total_users,
        "total_donations":  totals.get("total_donations", 0),
        "delivered":        totals.get("delivered", 0),
        "delivered_qty":    totals.get("delivered_qty", 0),
        "available":        totals.get("available", 0),
        "cancelled":        totals.get("cancelled", 0),
    }), 200


@admin_bp.route("/users", methods=["GET"])
@token_required
@role_required("admin")
def list_users():
    page  = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 50))))
    skip  = (page - 1) * limit

    query = {}
    role_filter = request.args.get("role")
    if role_filter and role_filter in VALID_ROLES:
        query["role"] = role_filter

    total = db.users.count_documents(query)
    docs  = list(
        db.users.find(query, {"password": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    for d in docs:
        _serialize_user(d)

    return jsonify({"users": docs, "total": total, "page": page}), 200


@admin_bp.route("/users/<user_id>/role", methods=["PUT"])
@token_required
@role_required("admin")
def update_user_role(user_id):
    data = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip()

    if new_role not in VALID_ROLES:
        return jsonify({"error": f"role must be one of: {', '.join(VALID_ROLES)}"}), 400

    # Prevent admin from demoting themselves
    if user_id == g.user_id and new_role != "admin":
        return jsonify({"error": "Admin cannot change their own role"}), 400

    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    doc = db.users.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "User not found"}), 404

    db.users.update_one(
        {"_id": oid},
        {"$set": {"role": new_role, "updated_at": datetime.datetime.utcnow()}},
    )
    return jsonify({"message": f"Role updated to {new_role}"}), 200


@admin_bp.route("/users/<user_id>/verify", methods=["PUT"])
@token_required
@role_required("admin")
def verify_ngo(user_id):
    data     = request.get_json(silent=True) or {}
    verified = bool(data.get("verified", True))

    try:
        oid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    doc = db.users.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "User not found"}), 404
    if doc.get("role") != "ngo":
        return jsonify({"error": "Only NGO accounts can be verified"}), 400

    db.users.update_one(
        {"_id": oid},
        {"$set": {"verified": verified, "updated_at": datetime.datetime.utcnow()}},
    )
    return jsonify({"message": "verified" if verified else "unverified"}), 200


@admin_bp.route("/donations", methods=["GET"])
@token_required
@role_required("admin")
def list_all_donations():
    page   = max(1, int(request.args.get("page", 1)))
    limit  = min(100, max(1, int(request.args.get("limit", 50))))
    skip   = (page - 1) * limit
    status = request.args.get("status")

    query = {}
    if status and status != "all":
        query["status"] = status

    total = db.food_listings.count_documents(query)
    docs  = list(
        db.food_listings.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    for d in docs:
        _serialize_donation(d)

    return jsonify({"donations": docs, "total": total, "page": page}), 200
