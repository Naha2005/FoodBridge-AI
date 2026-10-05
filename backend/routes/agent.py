"""
FoodBridge AI — Smart Rescue Agent + General Chat
--------------------------------------------------
GET  /api/agent/health          – Check agent configuration status
POST /api/agent/chat            – General FoodBridge AI chat
POST /api/agent/rescue          – Smart Rescue: analyse a donation and recommend NGO matches
POST /api/agent/rescue/approve  – Approve an agent recommendation (marks donation as matched)
POST /api/agent/rescue/reject   – Reject an agent recommendation
GET  /api/agent/recommendations – List pending recommendations for current user
"""
import os
import datetime
import math
import json

from flask import Blueprint, request, jsonify, g
from groq import Groq, APIStatusError, APIConnectionError, RateLimitError
from bson import ObjectId

from config import Config
from db import db
from middleware import token_required

agent_bp = Blueprint("agent", __name__)

# ─────────────────────────────────────────────────────────────────────────────
# Groq client
# ─────────────────────────────────────────────────────────────────────────────

GROQ_API_KEY = Config.GROQ_API_KEY
GROQ_MODEL   = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
_client      = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

SYSTEM_PROMPT = """
You are FoodBridge AI — a helpful assistant for a food redistribution platform
supporting UN Sustainable Development Goal 2: Zero Hunger.

Your purpose is to help users understand food donations, NGO coordination,
surplus food management, donation matching, and food-waste reduction.

Rules you must always follow:
1. Never invent donation availability, NGO details, delivery status, or platform statistics.
   If live application data is not provided in the conversation, say you cannot verify it.
2. Never promise to create records, send notifications, or assign deliveries.
   All actions require explicit user confirmation.
3. Encourage responsible food handling. Do not claim food is safe without information.
4. Be concise and helpful. Use bullet points for lists.
"""

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _haversine_km(lat1, lng1, lat2, lng2):
    """Approximate straight-line distance in km between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


FOOD_TYPE_MAP = {
    "Cooked Meals": 0, "Raw Vegetables": 1, "Fruits": 2, "Dairy": 3,
    "Bread & Bakery": 4, "Canned Goods": 5, "Beverages": 6,
    "Grains & Rice": 1, "Snacks": 0, "Other": 0,
}


def _priority_score(donation, ngo, dist_km):
    """
    Transparent rule-based priority score (0–100).
    This is NOT a trained ML model — it is a deterministic rule engine.
    It is clearly labelled as such in all API responses.
    """
    score = 0.0

    # --- Quantity match (0–30 pts) ---
    ngo_need = ngo.get("portions_needed", 50)
    qty_ratio = min(float(donation.get("quantity", 0)) / max(float(ngo_need), 1), 2.0)
    score += 30 * min(qty_ratio, 1.0)

    # --- Category / food type match (0–20 pts) ---
    donation_type = FOOD_TYPE_MAP.get(donation.get("category", "Other"), 0)
    ngo_pref      = FOOD_TYPE_MAP.get(ngo.get("preferred_category", "Other"), 0)
    if donation_type == ngo_pref:
        score += 20

    # --- Urgency (0–20 pts) ---
    urgency = int(ngo.get("urgency", 2))          # 1–4
    score += urgency / 4 * 20

    # --- Distance penalty (0–20 pts) ---
    dist_score = max(0.0, 1 - dist_km / 30)       # 0 pts at 30 km, 20 pts at 0 km
    score += dist_score * 20

    # --- Capacity (0–10 pts) ---
    capacity_pct = float(ngo.get("capacity_pct", 50))
    if capacity_pct < 85:
        score += 10

    return round(min(score, 100), 1)


def _urgency_label(donation):
    """Determine urgency based on time until expiry."""
    expiry_str = donation.get("expiry_time")
    if not expiry_str:
        return "Medium", "Expiry not specified"

    if isinstance(expiry_str, datetime.datetime):
        expiry = expiry_str
    else:
        try:
            expiry = datetime.datetime.fromisoformat(expiry_str)
        except ValueError:
            return "Medium", "Could not parse expiry"

    hours_left = (expiry - datetime.datetime.utcnow()).total_seconds() / 3600

    if hours_left < 0:
        return "Expired", "This donation has passed its expiry time and cannot be redistributed."
    if hours_left < 4:
        return "Critical", f"Only {hours_left:.1f} hours until expiry — immediate pickup required."
    if hours_left < 12:
        return "High", f"{hours_left:.1f} hours until expiry — schedule pickup today."
    if hours_left < 24:
        return "Medium", f"{hours_left:.1f} hours until expiry — pickup within the day."
    return "Low", f"{hours_left:.1f} hours until expiry — standard scheduling."


def _build_explanation(donation, ngo, score, dist_km, urgency_label):
    reasons = []

    if donation.get("quantity") and ngo.get("portions_needed"):
        qty_ratio = float(donation["quantity"]) / max(float(ngo["portions_needed"]), 1)
        reasons.append(
            f"Quantity: {donation['quantity']} {donation.get('unit','portions')} covers "
            f"{min(qty_ratio*100, 100):.0f}% of NGO's stated need of {ngo['portions_needed']} portions"
        )

    donation_type = donation.get("category", "")
    ngo_pref      = ngo.get("preferred_category", "")
    if donation_type and ngo_pref:
        match_label = "✓ food category matches NGO preference" if donation_type == ngo_pref else "category differs from NGO preference"
        reasons.append(f"Food type: {donation_type} — {match_label}")

    reasons.append(f"Distance: approximately {dist_km:.1f} km from NGO location")
    reasons.append(f"Urgency: {urgency_label}")

    urgency_num = ngo.get("urgency", 2)
    urgency_map = {1: "Low", 2: "Moderate", 3: "High", 4: "Critical"}
    reasons.append(f"NGO demand urgency: {urgency_map.get(urgency_num, 'Moderate')}")

    return reasons


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@agent_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":           "ok",
        "chat_configured":  _client is not None,
        "model_configured": GROQ_MODEL,
    })


@agent_bp.route("/chat", methods=["POST"])
def chat():
    if _client is None:
        return jsonify({
            "error": "AI chat is not configured. Set GROQ_API_KEY in backend/.env"
        }), 503

    data        = request.get_json(silent=True) or {}
    user_msg    = data.get("message", "")
    history     = data.get("messages", [])

    if not isinstance(user_msg, str) or not user_msg.strip():
        return jsonify({"error": "Please enter a message."}), 400
    if len(user_msg) > 4000:
        return jsonify({"error": "Message too long (max 4000 chars)."}), 400
    if not isinstance(history, list):
        return jsonify({"error": "Invalid conversation history."}), 400

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history[-10:]:
        if not isinstance(item, dict):
            continue
        role    = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str) or len(content) > 4000:
            continue
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_msg.strip()})

    try:
        resp = _client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.5,
            max_completion_tokens=700,
        )
        return jsonify({"reply": resp.choices[0].message.content or "", "model": GROQ_MODEL}), 200

    except RateLimitError:
        return jsonify({"error": "AI rate limit reached. Try again in a moment."}), 429
    except APIStatusError as exc:
        if exc.status_code in (400, 404):
            return jsonify({"error": f"AI model error ({GROQ_MODEL}). Check your Groq dashboard."}), 502
        if exc.status_code in (401, 403):
            return jsonify({"error": "AI credentials rejected. Check GROQ_API_KEY."}), 502
        return jsonify({"error": "AI service temporarily unavailable."}), 502
    except APIConnectionError:
        return jsonify({"error": "Cannot reach AI service. Check internet connection."}), 503
    except Exception:
        return jsonify({"error": "Unexpected AI error."}), 500


@agent_bp.route("/rescue", methods=["POST"])
@token_required
def smart_rescue():
    """
    Smart Rescue Agent — analyses a donation and returns ranked NGO recommendations.
    
    Input (JSON):
        donation_id  – existing donation document ID (optional; or pass inline fields)
    
    The agent:
    1. Loads/validates the donation
    2. Checks urgency / expiry safety
    3. Queries eligible NGOs
    4. Calls ML match model if available, otherwise uses rule-based scoring
    5. Calls Groq to generate a natural-language explanation (falls back to template)
    6. Returns recommendations for user approval — does NOT automatically assign
    """
    data        = request.get_json(silent=True) or {}
    donation_id = data.get("donation_id")

    # ── Load donation from DB ──────────────────────────────────────────────────
    if donation_id:
        try:
            oid = ObjectId(donation_id)
        except Exception:
            return jsonify({"error": "Invalid donation_id"}), 400
        donation = db.food_listings.find_one({"_id": oid})
        if not donation:
            return jsonify({"error": "Donation not found"}), 404
    else:
        # Allow inline donation fields for quick analysis without DB write
        donation = {
            "_id":      None,
            "name":     data.get("name", "Unknown food"),
            "category": data.get("category", "Other"),
            "quantity": float(data.get("quantity", 0)),
            "unit":     data.get("unit", "portions"),
            "storage":  data.get("storage", "Room Temperature"),
            "expiry_time": data.get("expiry_time"),
            "lat":      data.get("lat"),
            "lng":      data.get("lng"),
            "status":   "available",
        }

    # ── Safety check ──────────────────────────────────────────────────────────
    urgency_label, urgency_note = _urgency_label(donation)
    if urgency_label == "Expired":
        return jsonify({
            "safe":         False,
            "urgency":      "Expired",
            "urgency_note": urgency_note,
            "message":      "This donation cannot be redistributed — it has passed its safe handling time.",
            "matches":      [],
        }), 200

    # ── Load spoilage ML prediction if model available ─────────────────────────
    spoilage_info = None
    try:
        import joblib, numpy as np, pandas as pd
        MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")
        spol_path = os.path.join(MODEL_DIR, "spoilage_model.joblib")
        if os.path.exists(spol_path):
            bundle = joblib.load(spol_path)
            cat    = donation.get("category", "cooked_meal").lower().replace(" & ", "_").replace(" ", "_")
            cats   = bundle.get("categories", [])
            if cat not in cats:
                cat = "cooked_meal"
            le      = bundle["label_encoder"]
            cat_enc = int(le.transform([cat])[0])

            # Map storage to temp
            storage = donation.get("storage", "Room Temperature")
            temp_c  = 4 if storage == "Refrigerated" else (-18 if storage == "Frozen" else 22)

            age_h    = float(donation.get("age_hours", 4))
            hum      = 60.0
            h2del    = float(donation.get("hours_to_deliver", 4))
            refrig   = int(temp_c < 8)

            row = pd.DataFrame(
                [[cat_enc, age_h, temp_c, refrig, hum, h2del]],
                columns=bundle["features"],
            )
            prob  = float(bundle["model"].predict_proba(row)[0][1])
            risk  = "High" if prob >= 0.7 else ("Medium" if prob >= 0.4 else "Low")
            spoilage_info = {
                "spoilage_probability": round(prob, 3),
                "risk_level":           risk,
                "model":                "XGBoost (trained)",
            }
    except Exception:
        pass  # ML unavailable — proceed without it

    # ── Find eligible NGOs ────────────────────────────────────────────────────
    ngos = list(db.users.find({"role": "ngo", "status": "active"}))
    if not ngos:
        return jsonify({
            "safe":         True,
            "urgency":      urgency_label,
            "urgency_note": urgency_note,
            "spoilage":     spoilage_info,
            "message":      "No registered NGOs found in the platform yet.",
            "matches":      [],
        }), 200

    # Also load active needs per NGO
    needs_by_ngo = {}
    for need in db.ngo_needs.find({"status": "active"}):
        nid = str(need.get("ngo_id", ""))
        if nid not in needs_by_ngo:
            needs_by_ngo[nid] = need

    donation_lat = donation.get("lat")
    donation_lng = donation.get("lng")

    # ── Try ML matching model ─────────────────────────────────────────────────
    ml_match_available = False
    match_bundle = None
    try:
        import joblib
        MODEL_DIR   = os.path.join(os.path.dirname(__file__), "..", "ml")
        match_path  = os.path.join(MODEL_DIR, "matching_model.joblib")
        if os.path.exists(match_path):
            match_bundle       = joblib.load(match_path)
            ml_match_available = True
    except Exception:
        pass

    # ── Score each NGO ────────────────────────────────────────────────────────
    matches = []
    for ngo in ngos:
        ngo_id    = str(ngo["_id"])
        need_doc  = needs_by_ngo.get(ngo_id, {})
        ngo_lat   = ngo.get("lat")
        ngo_lng   = ngo.get("lng")

        # Distance
        if donation_lat and donation_lng and ngo_lat and ngo_lng:
            dist_km = _haversine_km(donation_lat, donation_lng, ngo_lat, ngo_lng)
        else:
            dist_km = 10.0  # default when coordinates unavailable

        # Merge need info into ngo dict for scoring
        ngo_for_score = {
            **ngo,
            "portions_needed":     need_doc.get("portions_needed", 50),
            "preferred_category":  need_doc.get("category", ngo.get("preferred_category", "Other")),
            "urgency":             need_doc.get("urgency", 2),
            "capacity_pct":        ngo.get("capacity_pct", 50),
        }

        # Compute score
        if ml_match_available and match_bundle:
            try:
                import numpy as np, pandas as pd
                d_qty       = float(donation.get("quantity", 50))
                d_type      = FOOD_TYPE_MAP.get(donation.get("category", "Other"), 0)
                d_exp       = 12.0
                expiry_str  = donation.get("expiry_time")
                if expiry_str:
                    if isinstance(expiry_str, str):
                        exp_dt = datetime.datetime.fromisoformat(expiry_str)
                    else:
                        exp_dt = expiry_str
                    d_exp = max(0, (exp_dt - datetime.datetime.utcnow()).total_seconds() / 3600)
                n_need      = float(need_doc.get("portions_needed", 80))
                n_type      = FOOD_TYPE_MAP.get(ngo_for_score["preferred_category"], 0)
                n_urg       = int(ngo_for_score["urgency"])
                n_cap       = float(ngo.get("capacity_pct", 50))
                qty_ratio   = min(d_qty / max(n_need, 1), 2.0)
                type_match  = int(d_type == n_type)
                time_pres   = max(0, 1 - d_exp / 48)
                dist_pen    = max(0, 1 - dist_km / 30)
                cap_ok      = int(n_cap < 85)

                row = pd.DataFrame(
                    [[d_qty, d_type, d_exp, dist_km, n_need, n_type, n_urg,
                      n_cap, qty_ratio, type_match, time_pres, dist_pen, cap_ok]],
                    columns=match_bundle["features"],
                )
                score = float(np.clip(match_bundle["model"].predict(row)[0], 0, 1)) * 100
                score_source = "ML (LightGBM)"
            except Exception:
                score = _priority_score(donation, ngo_for_score, dist_km)
                score_source = "Rule-based (ML fallback)"
        else:
            score = _priority_score(donation, ngo_for_score, dist_km)
            score_source = "Rule-based"

        reasons = _build_explanation(donation, ngo_for_score, score, dist_km, urgency_label)

        matches.append({
            "ngo_id":            ngo_id,
            "ngo_name":          ngo.get("name", "Unknown NGO"),
            "ngo_org":           ngo.get("org_name", ""),
            "distance_km":       round(dist_km, 1),
            "score":             round(score, 1),
            "score_source":      score_source,
            "urgency_label":     urgency_label,
            "reasons":           reasons,
            "portions_needed":   ngo_for_score["portions_needed"],
            "preferred_category": ngo_for_score["preferred_category"],
        })

    # Sort by score descending
    matches.sort(key=lambda x: x["score"], reverse=True)
    top_matches = matches[:5]

    # ── Generate AI explanation (optional, graceful fallback) ─────────────────
    ai_summary = None
    if _client and top_matches:
        prompt = (
            f"A food donor has {donation.get('quantity', '?')} {donation.get('unit','portions')} "
            f"of {donation.get('name','food')} ({donation.get('category','')}) available for redistribution. "
            f"Urgency: {urgency_label}. {urgency_note}\n"
            f"Top NGO match: {top_matches[0]['ngo_name']} (score {top_matches[0]['score']:.0f}/100, "
            f"{top_matches[0]['distance_km']} km away).\n"
            f"Reasons: {'; '.join(top_matches[0]['reasons'][:3])}\n\n"
            "Write a clear 2–3 sentence recommended action for the donor. Be factual, helpful, and concise."
        )
        try:
            resp = _client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.4,
                max_completion_tokens=200,
            )
            ai_summary = resp.choices[0].message.content or None
        except Exception:
            pass

    if not ai_summary and top_matches:
        # Template fallback
        top = top_matches[0]
        ai_summary = (
            f"Recommend dispatching {donation.get('quantity','?')} {donation.get('unit','portions')} "
            f"of {donation.get('name','this food')} to {top['ngo_name']} "
            f"({top['distance_km']} km, match score {top['score']:.0f}/100). "
            f"Urgency: {urgency_label}. {urgency_note} "
            "Please review and approve or select a different NGO below."
        )

    # ── Save recommendation to DB for tracking ────────────────────────────────
    rec_doc = None
    if donation_id and top_matches:
        rec_doc = {
            "donation_id":   donation_id,
            "donor_id":      g.user_id,
            "top_ngo_id":    top_matches[0]["ngo_id"],
            "top_ngo_name":  top_matches[0]["ngo_name"],
            "top_score":     top_matches[0]["score"],
            "urgency":       urgency_label,
            "ai_summary":    ai_summary,
            "status":        "pending",  # pending | approved | rejected
            "created_at":    datetime.datetime.utcnow(),
        }
        result   = db.agent_recommendations.insert_one(rec_doc)
        rec_doc["recommendation_id"] = str(result.inserted_id)
        rec_doc.pop("_id", None)

    return jsonify({
        "safe":              True,
        "urgency":           urgency_label,
        "urgency_note":      urgency_note,
        "spoilage":          spoilage_info,
        "recommendation":    ai_summary,
        "matches":           top_matches,
        "recommendation_id": rec_doc["recommendation_id"] if rec_doc else None,
        "disclaimer":        "Actions below require your explicit approval. No assignment will be made automatically.",
    }), 200


@agent_bp.route("/rescue/approve", methods=["POST"])
@token_required
def approve_recommendation():
    """
    User approves a recommendation: marks donation as matched to the chosen NGO.
    Requires:  recommendation_id, ngo_id (from the matches list)
    """
    data    = request.get_json(silent=True) or {}
    rec_id  = data.get("recommendation_id")
    ngo_id  = data.get("ngo_id")

    if not rec_id or not ngo_id:
        return jsonify({"error": "recommendation_id and ngo_id are required"}), 400

    try:
        rec_oid = ObjectId(rec_id)
    except Exception:
        return jsonify({"error": "Invalid recommendation_id"}), 400

    rec = db.agent_recommendations.find_one({"_id": rec_oid})
    if not rec:
        return jsonify({"error": "Recommendation not found"}), 404
    if rec.get("status") != "pending":
        return jsonify({"error": f"Recommendation already {rec.get('status')}"}), 400
    if rec.get("donor_id") != g.user_id and g.role != "admin":
        return jsonify({"error": "Not authorized to approve this recommendation"}), 403

    # Validate NGO
    try:
        ngo = db.users.find_one({"_id": ObjectId(ngo_id), "role": "ngo"})
    except Exception:
        ngo = None
    if not ngo:
        return jsonify({"error": "Selected NGO not found"}), 404

    # Mark donation as matched
    donation_id = rec.get("donation_id")
    now = datetime.datetime.utcnow()
    db.food_listings.update_one(
        {"_id": ObjectId(donation_id), "status": "available"},
        {"$set": {
            "status":           "matched",
            "matched_ngo_id":   ObjectId(ngo_id),
            "matched_ngo_name": ngo.get("name", ""),
            "updated_at":       now,
        }},
    )
    db.agent_recommendations.update_one(
        {"_id": rec_oid},
        {"$set": {"status": "approved", "approved_ngo_id": ngo_id, "approved_at": now}},
    )

    return jsonify({
        "message":  f"Donation matched to {ngo.get('name','')}. The NGO will be notified.",
        "ngo_name": ngo.get("name", ""),
    }), 200


@agent_bp.route("/rescue/reject", methods=["POST"])
@token_required
def reject_recommendation():
    data   = request.get_json(silent=True) or {}
    rec_id = data.get("recommendation_id")
    reason = (data.get("reason", "") or "").strip()

    if not rec_id:
        return jsonify({"error": "recommendation_id is required"}), 400
    try:
        rec_oid = ObjectId(rec_id)
    except Exception:
        return jsonify({"error": "Invalid recommendation_id"}), 400

    rec = db.agent_recommendations.find_one({"_id": rec_oid})
    if not rec:
        return jsonify({"error": "Recommendation not found"}), 404
    if rec.get("status") != "pending":
        return jsonify({"error": f"Recommendation already {rec.get('status')}"}), 400
    if rec.get("donor_id") != g.user_id and g.role != "admin":
        return jsonify({"error": "Not authorized to reject this recommendation"}), 403

    db.agent_recommendations.update_one(
        {"_id": rec_oid},
        {"$set": {"status": "rejected", "reject_reason": reason, "rejected_at": datetime.datetime.utcnow()}},
    )
    return jsonify({"message": "Recommendation rejected. The donation remains available."}), 200


@agent_bp.route("/recommendations", methods=["GET"])
@token_required
def list_recommendations():
    """List agent recommendations for the current user."""
    query  = {"donor_id": g.user_id}
    status = request.args.get("status")
    if status:
        query["status"] = status

    docs = list(
        db.agent_recommendations.find(query)
        .sort("created_at", -1)
        .limit(20)
    )
    for d in docs:
        d["id"] = str(d.pop("_id"))
        if "created_at" in d and isinstance(d["created_at"], datetime.datetime):
            d["created_at"] = d["created_at"].isoformat()
    return jsonify({"recommendations": docs}), 200
