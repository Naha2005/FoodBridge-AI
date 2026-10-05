"""
FoodBridge AI — NGO Needs routes
----------------------------------
POST /api/needs/         – Create a need (NGO only)
GET  /api/needs/         – List active needs (filterable)
GET  /api/needs/my       – Current NGO's needs
PUT  /api/needs/<id>     – Update a need
DELETE /api/needs/<id>   – Close/remove a need
"""
import datetime
from flask import Blueprint, request, jsonify, g
from db import db
from middleware import token_required, role_required
from bson import ObjectId

needs_bp = Blueprint("needs", __name__)

VALID_CATEGORIES = [
    "Cooked Meals", "Raw Vegetables", "Fruits", "Dairy",
    "Bread & Bakery", "Canned Goods", "Beverages", "Grains & Rice",
    "Snacks", "Other",
]

URGENCY_LEVELS = {1: "Low", 2: "Moderate", 3: "High", 4: "Critical"}


def _serialize(doc):
    doc["id"] = str(doc.pop("_id"))
    for k in ("created_at", "updated_at"):
        if k in doc and isinstance(doc[k], datetime.datetime):
            doc[k] = doc[k].isoformat()
    if "ngo_id" in doc:
        doc["ngo_id"] = str(doc["ngo_id"])
    return doc


@needs_bp.route("/", methods=["POST"])
@token_required
@role_required("ngo", "admin")
def create_need():
    data = request.get_json(silent=True) or {}
    category       = (data.get("category", "") or "").strip()
    portions_needed = data.get("portions_needed")
    pickup_time    = (data.get("pickup_time", "") or "").strip()
    urgency        = int(data.get("urgency", 2))
    notes          = (data.get("notes", "") or "").strip()

    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"Category must be one of: {', '.join(VALID_CATEGORIES)}"}), 400
    if not isinstance(portions_needed, (int, float)) or portions_needed <= 0:
        return jsonify({"error": "portions_needed must be a positive number"}), 400
    if urgency not in URGENCY_LEVELS:
        return jsonify({"error": "urgency must be 1–4 (1=Low, 2=Moderate, 3=High, 4=Critical)"}), 400

    now = datetime.datetime.utcnow()
    doc = {
        "ngo_id":         g.user_id,
        "ngo_name":       g.user.get("name", ""),
        "category":       category,
        "portions_needed": float(portions_needed),
        "pickup_time":    pickup_time,
        "urgency":        urgency,
        "urgency_label":  URGENCY_LEVELS[urgency],
        "notes":          notes,
        "status":         "active",
        "created_at":     now,
        "updated_at":     now,
    }
    result = db.ngo_needs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"message": "Need created", "need": _serialize(doc)}), 201


@needs_bp.route("/", methods=["GET"])
def get_needs():
    category = request.args.get("category")
    urgency  = request.args.get("urgency")
    page     = max(1, int(request.args.get("page", 1)))
    limit    = min(50, max(1, int(request.args.get("limit", 20))))
    skip     = (page - 1) * limit

    query = {"status": "active"}
    if category:
        query["category"] = category
    if urgency:
        try:
            query["urgency"] = int(urgency)
        except ValueError:
            pass

    total = db.ngo_needs.count_documents(query)
    docs  = list(db.ngo_needs.find(query).sort("urgency", -1).skip(skip).limit(limit))
    for d in docs:
        _serialize(d)
    return jsonify({"needs": docs, "total": total, "page": page}), 200


@needs_bp.route("/my", methods=["GET"])
@token_required
@role_required("ngo", "admin")
def my_needs():
    docs = list(db.ngo_needs.find({"ngo_id": g.user_id}).sort("created_at", -1))
    for d in docs:
        _serialize(d)
    return jsonify({"needs": docs}), 200


@needs_bp.route("/<need_id>", methods=["PUT"])
@token_required
@role_required("ngo", "admin")
def update_need(need_id):
    try:
        oid = ObjectId(need_id)
    except Exception:
        return jsonify({"error": "Invalid need ID"}), 400

    doc = db.ngo_needs.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Need not found"}), 404
    if doc.get("ngo_id") != g.user_id and g.role != "admin":
        return jsonify({"error": "Not authorized"}), 403

    data    = request.get_json(silent=True) or {}
    allowed = {"category", "portions_needed", "pickup_time", "urgency", "notes", "status"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if "urgency" in updates:
        try:
            updates["urgency"] = int(updates["urgency"])
            updates["urgency_label"] = URGENCY_LEVELS.get(updates["urgency"], "Moderate")
        except ValueError:
            return jsonify({"error": "urgency must be 1–4"}), 400
    updates["updated_at"] = datetime.datetime.utcnow()
    db.ngo_needs.update_one({"_id": oid}, {"$set": updates})
    return jsonify({"message": "Need updated"}), 200


@needs_bp.route("/<need_id>", methods=["DELETE"])
@token_required
@role_required("ngo", "admin")
def delete_need(need_id):
    try:
        oid = ObjectId(need_id)
    except Exception:
        return jsonify({"error": "Invalid need ID"}), 400

    doc = db.ngo_needs.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Need not found"}), 404
    if doc.get("ngo_id") != g.user_id and g.role != "admin":
        return jsonify({"error": "Not authorized"}), 403

    db.ngo_needs.update_one({"_id": oid}, {"$set": {"status": "closed", "updated_at": datetime.datetime.utcnow()}})
    return jsonify({"message": "Need closed"}), 200
