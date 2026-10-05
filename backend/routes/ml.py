"""
FoodBridge ML Routes
====================
Serves predictions from three trained models:

  POST /api/ml/predict-demand   – daily food portions forecast
  POST /api/ml/predict-spoilage – spoilage risk for a food item
  POST /api/ml/predict-match    – donor ↔ NGO match score
  GET  /api/ml/metrics          – real training metrics for all models
  GET  /api/ml/forecast-week    – 7-day demand forecast (used by frontend)
"""

import os
from datetime import date, timedelta
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request

ml_bp = Blueprint("ml", __name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")


# ──────────────────────────────────────────────────────────────────────────────
# Lazy model loader (cached after first call)
# ──────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=None)
def _load(name: str):
    path = os.path.join(MODEL_DIR, name)
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def demand_bundle():
    return _load("demand_model.joblib")

def spoilage_bundle():
    return _load("spoilage_model.joblib")

def matching_bundle():
    return _load("matching_model.joblib")


# ──────────────────────────────────────────────────────────────────────────────
# Helper: build a demand feature row from a date
# ──────────────────────────────────────────────────────────────────────────────

def _date_features(d: date) -> list:
    dow          = d.weekday()               # 0-6
    month        = d.month
    is_weekend   = int(dow >= 5)
    is_holiday   = 0                         # default; callers can override
    is_monsoon   = int(month in (6, 7, 8, 9))
    day_of_year  = d.timetuple().tm_yday
    return [dow, month, is_weekend, is_holiday, is_monsoon, day_of_year]


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/ml/predict-demand
# Body: { "day_of_week":int, "month":int, "is_weekend":0|1,
#          "is_holiday":0|1, "is_monsoon":0|1, "day_of_year":int }
# ──────────────────────────────────────────────────────────────────────────────

@ml_bp.route("/predict-demand", methods=["POST"])
def predict_demand():
    bundle = demand_bundle()
    if bundle is None:
        return jsonify({"error": "Demand model not found. Run train_model.py first."}), 503

    data = request.get_json(silent=True) or {}
    features = bundle["features"]

    try:
        row = pd.DataFrame([[float(data[f]) for f in features]], columns=features)
    except (KeyError, TypeError, ValueError) as exc:
        return jsonify({"error": f"Missing or invalid field: {exc}"}), 400

    prediction = int(round(bundle["model"].predict(row)[0]))
    return jsonify({
        "predicted_demand": prediction,
        "unit":             "portions",
        "model":            "Random Forest Regressor",
        "metrics":          bundle["metrics"],
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/ml/predict-spoilage
# Body: { "category": str,  "age_hours": float, "storage_temp_c": float,
#          "humidity_pct": float, "hours_to_deliver": float }
# ──────────────────────────────────────────────────────────────────────────────

@ml_bp.route("/predict-spoilage", methods=["POST"])
def predict_spoilage():
    bundle = spoilage_bundle()
    if bundle is None:
        return jsonify({"error": "Spoilage model not found. Run train_model.py first."}), 503

    data = request.get_json(silent=True) or {}

    try:
        le       = bundle["label_encoder"]
        category = data.get("category", "cooked_meal")
        if category not in bundle["categories"]:
            category = "cooked_meal"
        cat_enc  = int(le.transform([category])[0])

        age_hours        = float(data.get("age_hours", 4))
        storage_temp_c   = float(data.get("storage_temp_c", 20))
        is_refrigerated  = int(storage_temp_c < 8)
        humidity_pct     = float(data.get("humidity_pct", 60))
        hours_to_deliver = float(data.get("hours_to_deliver", 4))
    except (TypeError, ValueError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400

    spoilage_features = bundle["features"]
    row = pd.DataFrame(
        [[cat_enc, age_hours, storage_temp_c, is_refrigerated, humidity_pct, hours_to_deliver]],
        columns=spoilage_features,
    )

    model        = bundle["model"]
    prob_spoil   = float(model.predict_proba(row)[0][1])
    will_spoil   = prob_spoil >= 0.5

    risk_label = (
        "High"   if prob_spoil >= 0.70 else
        "Medium" if prob_spoil >= 0.40 else
        "Low"
    )

    return jsonify({
        "spoilage_probability": round(prob_spoil, 4),
        "will_spoil":           will_spoil,
        "risk_level":           risk_label,
        "model":                "XGBoost Classifier",
        "metrics":              bundle["metrics"],
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/ml/predict-match
# Body: { "donor_qty":int, "donor_food_type":int, "donor_exp_hours":float,
#          "donor_dist_km":float, "ngo_need_qty":int, "ngo_pref_type":int,
#          "ngo_urgency":int, "ngo_capacity_pct":float }
# ──────────────────────────────────────────────────────────────────────────────

@ml_bp.route("/predict-match", methods=["POST"])
def predict_match():
    bundle = matching_bundle()
    if bundle is None:
        return jsonify({"error": "Matching model not found. Run train_model.py first."}), 503

    data = request.get_json(silent=True) or {}

    try:
        donor_qty        = float(data.get("donor_qty",        50))
        donor_food_type  = int(  data.get("donor_food_type",  0))
        donor_exp_hours  = float(data.get("donor_exp_hours",  12))
        donor_dist_km    = float(data.get("donor_dist_km",    5))
        ngo_need_qty     = float(data.get("ngo_need_qty",     80))
        ngo_pref_type    = int(  data.get("ngo_pref_type",    0))
        ngo_urgency      = int(  data.get("ngo_urgency",      2))
        ngo_capacity_pct = float(data.get("ngo_capacity_pct", 50))
    except (TypeError, ValueError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400

    qty_ratio       = min(donor_qty / max(ngo_need_qty, 1), 2.0)
    type_match      = int(donor_food_type == ngo_pref_type)
    time_pressure   = max(0.0, 1 - donor_exp_hours / 48)
    dist_penalty    = max(0.0, 1 - donor_dist_km / 30)
    capacity_ok     = int(ngo_capacity_pct < 85)

    match_features = bundle["features"]
    row = pd.DataFrame(
        [[donor_qty, donor_food_type, donor_exp_hours, donor_dist_km,
          ngo_need_qty, ngo_pref_type, ngo_urgency, ngo_capacity_pct,
          qty_ratio, type_match, time_pressure, dist_penalty, capacity_ok]],
        columns=match_features,
    )

    score = float(np.clip(bundle["model"].predict(row)[0], 0, 1))

    quality = (
        "Excellent" if score >= 0.80 else
        "Good"      if score >= 0.60 else
        "Fair"      if score >= 0.40 else
        "Poor"
    )

    return jsonify({
        "match_score":   round(score, 4),
        "match_quality": quality,
        "model":         "LightGBM Regressor",
        "metrics":       bundle["metrics"],
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/ml/forecast-week
# Returns 7-day demand predictions starting from today.
# Used directly by the DemandForecast frontend page.
# ──────────────────────────────────────────────────────────────────────────────

@ml_bp.route("/forecast-week", methods=["GET"])
def forecast_week():
    bundle = demand_bundle()
    if bundle is None:
        return jsonify({"error": "Demand model not found. Run train_model.py first."}), 503

    model    = bundle["model"]
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today    = date.today()

    results = []
    features = bundle["features"]
    for i in range(7):
        d    = today + timedelta(days=i)
        row  = pd.DataFrame([_date_features(d)], columns=features)
        pred = int(round(model.predict(row)[0]))
        results.append({
            "day":       day_names[d.weekday()],
            "date":      d.isoformat(),
            "predicted": pred,
            "is_future": i > 0,
        })

    peak_day  = max(results, key=lambda x: x["predicted"])
    metrics   = bundle["metrics"]

    return jsonify({
        "forecast":  results,
        "peak_day":  peak_day,
        "model":     "Random Forest Regressor",
        "metrics":   metrics,
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/ml/metrics
# ──────────────────────────────────────────────────────────────────────────────

@ml_bp.route("/metrics", methods=["GET"])
def ml_metrics():
    demand   = demand_bundle()
    spoilage = spoilage_bundle()
    matching = matching_bundle()

    return jsonify({
        "demand_forecast": {
            "model":   "Random Forest Regressor",
            "metrics": demand["metrics"]   if demand   else "model not loaded",
        },
        "spoilage_risk": {
            "model":   "XGBoost Classifier",
            "metrics": spoilage["metrics"] if spoilage else "model not loaded",
        },
        "donor_ngo_matching": {
            "model":   "LightGBM Regressor",
            "metrics": matching["metrics"] if matching else "model not loaded",
        },
    }), 200
