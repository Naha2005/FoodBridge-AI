"""
SDG 2 – Zero Hunger | FoodBridge ML Training Script
====================================================
Trains and saves three models:
  1. demand_model.joblib       – Random-Forest demand forecast (portions/day)
  2. spoilage_model.joblib     – XGBoost spoilage-risk classifier (0–1 probability)
  3. matching_model.joblib     – LightGBM donor↔NGO match scorer (0–1 suitability)

Run:
    python backend/ml/train_model.py
"""

import os
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, roc_auc_score, accuracy_score
from sklearn.preprocessing import LabelEncoder

import xgboost as xgb
import lightgbm as lgb

# ──────────────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.dirname(__file__)

# ══════════════════════════════════════════════════════════════════════════════
# 1.  DEMAND FORECAST MODEL
#     Predicts daily food portions needed by NGOs given calendar features.
# ══════════════════════════════════════════════════════════════════════════════

def generate_demand_data(days: int = 730) -> pd.DataFrame:
    """Generate 2 years of synthetic daily food-demand data."""
    np.random.seed(42)
    dates = pd.date_range(start="2023-01-01", periods=days)
    rows = []

    for date in dates:
        dow = date.dayofweek          # 0 = Monday … 6 = Sunday
        month = date.month
        is_weekend = int(dow >= 5)
        is_holiday = int(np.random.rand() < 0.05)
        is_monsoon = int(month in (6, 7, 8, 9))  # Jun-Sep: higher need

        # Seasonal baseline
        seasonal = 20 * np.sin(2 * np.pi * (date.dayofyear / 365)) + 10

        base = 100
        demand = (
            base
            + seasonal
            + (np.random.randint(30, 60) if is_weekend else 0)
            + (np.random.randint(50, 90) if is_holiday else 0)
            + (np.random.randint(10, 30) if is_monsoon else 0)
            + np.random.randint(-15, 15)
        )

        rows.append({
            "day_of_week":   dow,
            "month":         month,
            "is_weekend":    is_weekend,
            "is_holiday":    is_holiday,
            "is_monsoon":    is_monsoon,
            "day_of_year":   date.dayofyear,
            "target_demand": max(0, int(demand)),
        })

    return pd.DataFrame(rows)


def train_demand_model():
    print("\n-- MODEL 1: Demand Forecast (Random Forest Regressor) --")
    df = generate_demand_data()

    features = ["day_of_week", "month", "is_weekend",
                "is_holiday", "is_monsoon", "day_of_year"]
    X = df[features]
    y = df["target_demand"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2   = r2_score(y_test, preds)
    print(f"  Training samples : {len(X_train)}")
    print(f"  RMSE             : {rmse:.2f} portions")
    print(f"  R² Score         : {r2:.4f}")

    path = os.path.join(MODEL_DIR, "demand_model.joblib")
    joblib.dump({
        "model":    model,
        "features": features,
        "metrics":  {"rmse": float(round(rmse, 2)), "r2": float(round(r2, 4))},
    }, path)
    print(f"  Saved --> {path}")
    return model, features


# ══════════════════════════════════════════════════════════════════════════════
# 2.  SPOILAGE RISK MODEL
#     Binary classifier – will this food item spoil before redistribution?
# ══════════════════════════════════════════════════════════════════════════════

FOOD_CATEGORIES = [
    "cooked_meal", "raw_vegetables", "fruits", "dairy",
    "bread_bakery", "canned_goods", "beverages",
]

CATEGORY_BASE_SHELF_DAYS = {
    "cooked_meal":    1,
    "raw_vegetables": 4,
    "fruits":         5,
    "dairy":          3,
    "bread_bakery":   2,
    "canned_goods":  180,
    "beverages":      30,
}


def generate_spoilage_data(n: int = 5000) -> pd.DataFrame:
    """Synthetic food-item dataset for spoilage classification."""
    np.random.seed(7)
    le = LabelEncoder().fit(FOOD_CATEGORIES)

    rows = []
    for _ in range(n):
        cat   = np.random.choice(FOOD_CATEGORIES)
        shelf = CATEGORY_BASE_SHELF_DAYS[cat]
        age_hours        = np.random.uniform(0, shelf * 30)   # hours since prepared
        storage_temp_c   = np.random.uniform(0, 35)           # °C
        is_refrigerated  = int(storage_temp_c < 8)
        humidity_pct     = np.random.uniform(30, 95)
        hours_to_deliver = np.random.uniform(1, 24)

        # Spoilage logic
        effective_shelf_hours = shelf * 24
        if is_refrigerated:
            effective_shelf_hours *= 2.5
        if humidity_pct > 80:
            effective_shelf_hours *= 0.8
        remaining = effective_shelf_hours - age_hours
        will_spoil = int(remaining < hours_to_deliver + np.random.uniform(-4, 4))

        rows.append({
            "category_enc":    le.transform([cat])[0],
            "age_hours":       round(age_hours, 1),
            "storage_temp_c":  round(storage_temp_c, 1),
            "is_refrigerated": is_refrigerated,
            "humidity_pct":    round(humidity_pct, 1),
            "hours_to_deliver":round(hours_to_deliver, 1),
            "will_spoil":      will_spoil,
        })

    df = pd.DataFrame(rows)
    return df, le


def train_spoilage_model():
    print("\n-- MODEL 2: Spoilage Risk (XGBoost Classifier) --")
    df, le = generate_spoilage_data()

    features = ["category_enc", "age_hours", "storage_temp_c",
                "is_refrigerated", "humidity_pct", "hours_to_deliver"]
    X = df[features]
    y = df["will_spoil"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_train, y_train,
              eval_set=[(X_test, y_test)],
              verbose=False)

    preds_prob = model.predict_proba(X_test)[:, 1]
    preds_bin  = (preds_prob >= 0.5).astype(int)
    auc = roc_auc_score(y_test, preds_prob)
    acc = accuracy_score(y_test, preds_bin)
    print(f"  Training samples : {len(X_train)}")
    print(f"  ROC-AUC          : {auc:.4f}")
    print(f"  Accuracy         : {acc:.4f}")

    path = os.path.join(MODEL_DIR, "spoilage_model.joblib")
    joblib.dump({
        "model":          model,
        "features":       features,
        "label_encoder":  le,
        "categories":     FOOD_CATEGORIES,
        "metrics":        {"roc_auc": float(round(auc, 4)), "accuracy": float(round(acc, 4))},
    }, path)
    print(f"  Saved --> {path}")
    return model, le, features


# ══════════════════════════════════════════════════════════════════════════════
# 3.  DONOR–NGO MATCHING MODEL
#     Ranks how well a donation matches an NGO's current need (0–1 score).
# ══════════════════════════════════════════════════════════════════════════════

def generate_matching_data(n: int = 8000) -> pd.DataFrame:
    """Synthetic donor↔NGO pairing dataset."""
    np.random.seed(13)
    rows = []

    for _ in range(n):
        # Donor side
        donor_qty        = np.random.randint(5, 200)     # kg or portions
        donor_food_type  = np.random.randint(0, 7)       # 7 categories
        donor_exp_hours  = np.random.uniform(1, 48)      # expires in N hours
        donor_dist_km    = np.random.uniform(0.5, 30)    # km from NGO

        # NGO side
        ngo_need_qty     = np.random.randint(10, 300)
        ngo_pref_type    = np.random.randint(0, 7)
        ngo_urgency      = np.random.randint(1, 5)       # 1 = low … 4 = critical
        ngo_capacity_pct = np.random.uniform(0, 100)     # current storage used %

        # Derived features
        qty_ratio        = min(donor_qty / max(ngo_need_qty, 1), 2.0)
        type_match       = int(donor_food_type == ngo_pref_type)
        time_pressure    = max(0, 1 - donor_exp_hours / 48)
        dist_penalty     = max(0, 1 - donor_dist_km / 30)
        capacity_ok      = int(ngo_capacity_pct < 85)

        # Match score heuristic (what the model should learn to approximate)
        score = (
            0.35 * min(qty_ratio, 1.0)
            + 0.25 * type_match
            + 0.15 * (ngo_urgency / 4)
            + 0.15 * dist_penalty
            + 0.10 * capacity_ok
            + np.random.uniform(-0.05, 0.05)   # noise
        )
        score = float(np.clip(score, 0, 1))

        rows.append({
            "donor_qty":        donor_qty,
            "donor_food_type":  donor_food_type,
            "donor_exp_hours":  round(donor_exp_hours, 1),
            "donor_dist_km":    round(donor_dist_km, 1),
            "ngo_need_qty":     ngo_need_qty,
            "ngo_pref_type":    ngo_pref_type,
            "ngo_urgency":      ngo_urgency,
            "ngo_capacity_pct": round(ngo_capacity_pct, 1),
            "qty_ratio":        round(qty_ratio, 3),
            "type_match":       type_match,
            "time_pressure":    round(time_pressure, 3),
            "dist_penalty":     round(dist_penalty, 3),
            "capacity_ok":      capacity_ok,
            "match_score":      round(score, 4),
        })

    return pd.DataFrame(rows)


def train_matching_model():
    print("\n-- MODEL 3: Donor-NGO Matching (LightGBM Regressor) --")
    df = generate_matching_data()

    features = [
        "donor_qty", "donor_food_type", "donor_exp_hours", "donor_dist_km",
        "ngo_need_qty", "ngo_pref_type", "ngo_urgency", "ngo_capacity_pct",
        "qty_ratio", "type_match", "time_pressure", "dist_penalty", "capacity_ok",
    ]
    X = df[features]
    y = df["match_score"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = lgb.LGBMRegressor(
        n_estimators=400,
        learning_rate=0.04,
        num_leaves=63,
        max_depth=8,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_samples=20,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    model.fit(
        X_train, y_train,
        eval_X=X_test,
        eval_y=y_test,
        callbacks=[lgb.early_stopping(50, verbose=False),
                   lgb.log_evaluation(period=-1)],
    )

    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2   = r2_score(y_test, preds)
    print(f"  Training samples : {len(X_train)}")
    print(f"  RMSE             : {rmse:.4f}")
    print(f"  R² Score         : {r2:.4f}")

    path = os.path.join(MODEL_DIR, "matching_model.joblib")
    joblib.dump({
        "model":    model,
        "features": features,
        "metrics":  {"rmse": float(round(rmse, 4)), "r2": float(round(r2, 4))},
    }, path)
    print(f"  Saved --> {path}")
    return model, features


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  FoodBridge ML – Training Pipeline")
    print("  SDG 2: Zero Hunger | Food Redistribution Agent")
    print("=" * 60)

    train_demand_model()
    train_spoilage_model()
    train_matching_model()

    print("\n[OK] All models trained and saved to backend/ml/")
    print("=" * 60)
