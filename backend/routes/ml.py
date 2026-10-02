from flask import Blueprint, jsonify
import random

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/predict-demand', methods=['POST'])
def predict_demand():
    # Mocking ML prediction for MVP due to lack of dataset context in this run
    prediction = random.randint(50, 200)
    return jsonify({"predicted_demand": prediction, "unit": "portions", "note": "Demonstration value"}), 200

@ml_bp.route('/metrics', methods=['GET'])
def ml_metrics():
    return jsonify({"MAE": 12.5, "RMSE": 18.2, "Model": "Random Forest Regressor"}), 200
