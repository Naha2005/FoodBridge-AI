"""
FoodBridge AI — Food donation routes
--------------------------------------
POST /api/food/                      – Create a new donation listing (donor only)
GET  /api/food/                      – Get available donations (filterable)
GET  /api/food/my                    – Get current donor's donations
GET  /api/food/<id>                  – Get single donation
PUT  /api/food/<id>/status           – Update donation status
DELETE /api/food/<id>                – Cancel/delete donation (donor/admin)
GET  /api/food/stats                 – Platform-wide statistics (public summary)
POST /api/food/<id>/accept           – NGO accepts a donation
POST /api/food/<id>/reject           – NGO rejects a donation offer
POST /api/food/<id>/pickup           – Mark as picked up
POST /api/food/<id>/deliver          – Mark as delivered
"""
import datetime
from flask import Blueprint, request, jsonify, g
from db import db
from middleware import token_required, role_required
from bson import ObjectId

food_bp = Blueprint("food", __name__)

VALID_CATEGORIES = [
    "Cooked Meals", "Raw Vegetables", "Fruits", "Dairy",
    "Bread & Bakery", "Canned Goods", "Beverages", "Grains & Rice",
    "Snacks", "Other",
]

VALID_STORAGE = ["Refrigerated", "Room Temperature", "Frozen"]

VALID_STATUSES = {
    "available", "matched", "accepted", "scheduled",
    "picked_up", "delivered", "cancelled", "expired",
}

# Valid state transitions: current_status -> allowed next statuses
TRANSITIONS = {
    "available":  {"matched", "cancelled"},
    "matched":    {"accepted", "cancelled", "available"},
    "accepted":   {"scheduled", "cancelled"},
    "scheduled":  {"picked_up", "cancelled"},
    "picked_up":  {"delivered", "cancelled"},
    "delivered":  set(),
    "cancelled":  set(),
    "expired":    set(),
}

FOOD_TYPE_MAP = {
    "Cooked Meals": 0, "Raw Vegetables": 1, "Fruits": 2, "Dairy": 3,
    "Bread & Bakery": 4, "Canned Goods": 5, "Beverages": 6,
    "Grains & Rice": 1, "Snacks": 0, "Other": 0,
}


def _serialize(doc):
    """Convert a MongoDB document to a JSON-serializable dict."""
    doc["id"]  = str(doc.pop("_id"))
    for k in ("created_at", "updated_at", "expiry_time", "prep_time", "collection_deadline"):
        if k in doc and isinstance(doc[k], datetime.datetime):
            doc[k] = doc[k].isoformat()
    if "donor_id" in doc:
        doc["donor_id"] = str(doc["donor_id"])
    if "matched_ngo_id" in doc and doc["matched_ngo_id"]:
        doc["matched_ngo_id"] = str(doc["matched_ngo_id"])
    return doc


@food_bp.route("/", methods=["POST"])
@token_required
@role_required("donor", "admin")
def create_donation():
    data = request.get_json(silent=True) or {}

    name     = (data.get("name", "") or "").strip()
    category = (data.get("category", "") or "").strip()
    quantity = data.get("quantity")
    unit     = (data.get("unit", "portions") or "portions").strip()
    storage  = (data.get("storage", "Room Temperature") or "Room Temperature").strip()
    notes    = (data.get("notes", "") or "").strip()
    address  = (data.get("address", "") or "").strip()
    lat      = data.get("lat")
    lng      = data.get("lng")

    if not name:
        return jsonify({"error": "Food name is required"}), 400
    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"Category must be one of: {', '.join(VALID_CATEGORIES)}"}), 400
    if not isinstance(quantity, (int, float)) or quantity <= 0:
        return jsonify({"error": "Quantity must be a positive number"}), 400
    if storage not in VALID_STORAGE:
        return jsonify({"error": f"Storage must be one of: {', '.join(VALID_STORAGE)}"}), 400

    # Parse timestamps
    try:
        prep_time = datetime.datetime.fromisoformat(data["prep_time"]) if data.get("prep_time") else datetime.datetime.utcnow()
    except (ValueError, KeyError):
        prep_time = datetime.datetime.utcnow()

    try:
        expiry_time = datetime.datetime.fromisoformat(data["expiry_time"]) if data.get("expiry_time") else None
    except (ValueError, KeyError):
        expiry_time = None

    try:
        collection_deadline = datetime.datetime.fromisoformat(data["collection_deadline"]) if data.get("collection_deadline") else None
    except (ValueError, KeyError):
        collection_deadline = None

    if expiry_time and expiry_time < datetime.datetime.utcnow():
        return jsonify({"error": "Expiry time cannot be in the past"}), 400

    # Compute age_hours and hours_to_deliver for spoilage preview
    age_hours = (datetime.datetime.utcnow() - prep_time).total_seconds() / 3600
    hours_to_deliver = 4.0  # default estimate

    now = datetime.datetime.utcnow()
    doc = {
        "name":                name,
        "category":            category,
        "food_type_enc":       FOOD_TYPE_MAP.get(category, 0),
        "quantity":            float(quantity),
        "unit":                unit,
        "storage":             storage,
        "notes":               notes,
        "address":             address,
        "lat":                 lat,
        "lng":                 lng,
        "prep_time":           prep_time,
        "expiry_time":         expiry_time,
        "collection_deadline": collection_deadline,
        "age_hours":           round(age_hours, 2),
        "hours_to_deliver":    hours_to_deliver,
        "status":              "available",
        "donor_id":            ObjectId(g.user_id),
        "donor_name":          g.user.get("name", ""),
        "matched_ngo_id":      None,
        "matched_ngo_name":    None,
        "accepted_at":         None,
        "picked_up_at":        None,
        "delivered_at":        None,
        "created_at":          now,
        "updated_at":          now,
    }

    result = db.food_listings.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"message": "Donation created successfully", "donation": _serialize(doc)}), 201


@food_bp.route("/", methods=["GET"])
def get_listings():
    """Public: list available donations with optional filters."""
    category = request.args.get("category")
    status   = request.args.get("status", "available")
    search   = request.args.get("search", "").strip()
    page     = max(1, int(request.args.get("page", 1)))
    limit    = min(50, max(1, int(request.args.get("limit", 20))))
    skip     = (page - 1) * limit

    query = {}
    if status and status != "all":
        query["status"] = status
    if category:
        query["category"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    total = db.food_listings.count_documents(query)
    listings = list(
        db.food_listings.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    # Don't expose exact pickup address in public listing
    for lst in listings:
        lst.pop("lat", None)
        lst.pop("lng", None)
        _serialize(lst)

    return jsonify({
        "donations": listings,
        "total":     total,
        "page":      page,
        "pages":     (total + limit - 1) // limit,
    }), 200


@food_bp.route("/my", methods=["GET"])
@token_required
def my_donations():
    """Authenticated donor: see their own donations."""
    page  = max(1, int(request.args.get("page", 1)))
    limit = min(50, max(1, int(request.args.get("limit", 20))))
    skip  = (page - 1) * limit

    query = {"donor_id": ObjectId(g.user_id)}
    total = db.food_listings.count_documents(query)
    docs  = list(
        db.food_listings.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    for d in docs:
        _serialize(d)
    return jsonify({"donations": docs, "total": total, "page": page}), 200


@food_bp.route("/<donation_id>", methods=["GET"])
def get_donation(donation_id):
    try:
        oid = ObjectId(donation_id)
    except Exception:
        return jsonify({"error": "Invalid donation ID"}), 400
    doc = db.food_listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Donation not found"}), 404
    return jsonify(_serialize(doc)), 200


@food_bp.route("/<donation_id>", methods=["DELETE"])
@token_required
def cancel_donation(donation_id):
    try:
        oid = ObjectId(donation_id)
    except Exception:
        return jsonify({"error": "Invalid donation ID"}), 400

    doc = db.food_listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Donation not found"}), 404

    if str(doc["donor_id"]) != g.user_id and g.role != "admin":
        return jsonify({"error": "Not authorized to cancel this donation"}), 403

    if doc["status"] in ("delivered", "cancelled"):
        return jsonify({"error": f"Cannot cancel a donation in '{doc['status']}' state"}), 400

    db.food_listings.update_one(
        {"_id": oid},
        {"$set": {"status": "cancelled", "updated_at": datetime.datetime.utcnow()}},
    )
    _log_event(donation_id, "cancelled", g.user_id, "Donation cancelled by donor/admin")
    return jsonify({"message": "Donation cancelled"}), 200


@food_bp.route("/<donation_id>/accept", methods=["POST"])
@token_required
@role_required("ngo")
def accept_donation(donation_id):
    """NGO accepts an available donation."""
    try:
        oid = ObjectId(donation_id)
    except Exception:
        return jsonify({"error": "Invalid donation ID"}), 400

    doc = db.food_listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Donation not found"}), 404

    if doc["status"] not in ("available", "matched"):
        return jsonify({"error": f"Cannot accept a donation in '{doc['status']}' state"}), 400

    now = datetime.datetime.utcnow()
    db.food_listings.update_one(
        {"_id": oid},
        {"$set": {
            "status":           "accepted",
            "matched_ngo_id":   ObjectId(g.user_id),
            "matched_ngo_name": g.user.get("name", ""),
            "accepted_at":      now,
            "updated_at":       now,
        }},
    )
    _log_event(donation_id, "accepted", g.user_id, f"Accepted by NGO {g.user.get('name','')}")
    return jsonify({"message": "Donation accepted successfully"}), 200


@food_bp.route("/<donation_id>/reject", methods=["POST"])
@token_required
@role_required("ngo")
def reject_donation(donation_id):
    """NGO rejects a matched donation, returning it to available."""
    try:
        oid = ObjectId(donation_id)
    except Exception:
        return jsonify({"error": "Invalid donation ID"}), 400

    doc = db.food_listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Donation not found"}), 404

    if doc.get("matched_ngo_id") and str(doc["matched_ngo_id"]) != g.user_id and g.role != "admin":
        return jsonify({"error": "Not authorized to reject this donation"}), 403

    if doc["status"] not in ("matched", "accepted"):
        return jsonify({"error": f"Cannot reject a donation in '{doc['status']}' state"}), 400

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason", "") or "").strip()

    db.food_listings.update_one(
        {"_id": oid},
        {"$set": {
            "status":           "available",
            "matched_ngo_id":   None,
            "matched_ngo_name": None,
            "updated_at":       datetime.datetime.utcnow(),
        }},
    )
    _log_event(donation_id, "rejected", g.user_id, f"Rejected: {reason}")
    return jsonify({"message": "Donation returned to available pool"}), 200


@food_bp.route("/<donation_id>/pickup", methods=["POST"])
@token_required
@role_required("ngo", "volunteer", "admin")
def mark_picked_up(donation_id):
    try:
        oid = ObjectId(donation_id)
    except Exception:
        return jsonify({"error": "Invalid donation ID"}), 400

    doc = db.food_listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Donation not found"}), 404
    if doc["status"] not in ("accepted", "scheduled"):
        return jsonify({"error": f"Cannot mark pickup for '{doc['status']}' donation"}), 400

    now = datetime.datetime.utcnow()
    db.food_listings.update_one(
        {"_id": oid},
        {"$set": {"status": "picked_up", "picked_up_at": now, "updated_at": now}},
    )
    _log_event(donation_id, "picked_up", g.user_id, "Marked as picked up")
    return jsonify({"message": "Donation marked as picked up"}), 200


@food_bp.route("/<donation_id>/deliver", methods=["POST"])
@token_required
@role_required("ngo", "volunteer", "admin")
def mark_delivered(donation_id):
    try:
        oid = ObjectId(donation_id)
    except Exception:
        return jsonify({"error": "Invalid donation ID"}), 400

    doc = db.food_listings.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Donation not found"}), 404
    if doc["status"] != "picked_up":
        return jsonify({"error": f"Cannot mark delivery for '{doc['status']}' donation"}), 400

    now = datetime.datetime.utcnow()
    db.food_listings.update_one(
        {"_id": oid},
        {"$set": {"status": "delivered", "delivered_at": now, "updated_at": now}},
    )
    _log_event(donation_id, "delivered", g.user_id, "Marked as delivered")
    return jsonify({"message": "Donation marked as delivered"}), 200


@food_bp.route("/stats", methods=["GET"])
def platform_stats():
    """Return aggregate statistics for the impact dashboard."""
    pipeline_total = db.food_listings.aggregate([
        {"$group": {
            "_id": None,
            "total_donations":  {"$sum": 1},
            "total_portions":   {"$sum": "$quantity"},
            "delivered":        {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
            "delivered_qty":    {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, "$quantity", 0]}},
            "available":        {"$sum": {"$cond": [{"$eq": ["$status", "available"]}, 1, 0]}},
            "cancelled":        {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}},
        }}
    ])
    totals = next(pipeline_total, {})
    totals.pop("_id", None)

    # Category breakdown for delivered
    pipeline_cat = db.food_listings.aggregate([
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": "$category", "qty": {"$sum": "$quantity"}}},
        {"$sort": {"qty": -1}},
    ])
    categories = [{"name": r["_id"], "value": r["qty"]} for r in pipeline_cat if r["_id"]]

    # Monthly trend (last 6 months)
    six_months_ago = datetime.datetime.utcnow() - datetime.timedelta(days=180)
    pipeline_monthly = db.food_listings.aggregate([
        {"$match": {"created_at": {"$gte": six_months_ago}}},
        {"$group": {
            "_id": {
                "year":  {"$year":  "$created_at"},
                "month": {"$month": "$created_at"},
            },
            "saved":   {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, "$quantity", 0]}},
            "wasted":  {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, "$quantity", 0]}},
            "total":   {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ])
    months_abbr = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly = [
        {
            "name":  months_abbr[r["_id"]["month"]],
            "saved": r["saved"],
            "wasted": r["wasted"],
            "total": r["total"],
        }
        for r in pipeline_monthly
    ]

    ngo_count   = db.users.count_documents({"role": "ngo"})
    donor_count = db.users.count_documents({"role": "donor"})

    return jsonify({
        **totals,
        "ngo_count":    ngo_count,
        "donor_count":  donor_count,
        "categories":   categories,
        "monthly":      monthly,
    }), 200


@food_bp.route("/donor-stats", methods=["GET"])
@token_required
@role_required("donor", "admin")
def donor_stats():
    donor_id = ObjectId(g.user_id)
    pipeline = db.food_listings.aggregate([
        {"$match": {"donor_id": donor_id}},
        {"$group": {
            "_id": None,
            "total":     {"$sum": 1},
            "total_qty": {"$sum": "$quantity"},
            "delivered": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
            "pending":   {"$sum": {"$cond": [{"$in": ["$status", ["available", "matched", "accepted", "scheduled"]]} , 1, 0]}},
            "cancelled": {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}},
        }}
    ])
    stats = next(pipeline, {
        "total": 0, "total_qty": 0, "delivered": 0, "pending": 0, "cancelled": 0,
    })
    stats.pop("_id", None)
    return jsonify(stats), 200


@food_bp.route("/ngo-stats", methods=["GET"])
@token_required
@role_required("ngo", "admin")
def ngo_stats():
    ngo_id = ObjectId(g.user_id)
    pipeline = db.food_listings.aggregate([
        {"$match": {"matched_ngo_id": ngo_id}},
        {"$group": {
            "_id": None,
            "accepted":  {"$sum": {"$cond": [{"$in": ["$status", ["accepted","scheduled","picked_up","delivered"]]}, 1, 0]}},
            "delivered": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
            "in_progress": {"$sum": {"$cond": [{"$in": ["$status", ["accepted", "scheduled", "picked_up"]]}, 1, 0]}},
            "qty_received": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, "$quantity", 0]}},
        }}
    ])
    stats = next(pipeline, {
        "accepted": 0, "delivered": 0, "in_progress": 0, "qty_received": 0,
    })
    stats.pop("_id", None)

    # Active NGO needs
    needs_count = db.ngo_needs.count_documents({"ngo_id": g.user_id, "status": "active"})
    stats["active_needs"] = needs_count
    return jsonify(stats), 200


def _log_event(donation_id, event_type, user_id, note=""):
    """Write an audit log entry."""
    try:
        db.audit_logs.insert_one({
            "donation_id": donation_id,
            "event_type":  event_type,
            "user_id":     user_id,
            "note":        note,
            "timestamp":   datetime.datetime.utcnow(),
        })
    except Exception:
        pass  # Non-critical
