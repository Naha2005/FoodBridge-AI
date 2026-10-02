from flask import Blueprint, request, jsonify
from db import db
import datetime

needs_bp = Blueprint('needs', __name__)

@needs_bp.route('/', methods=['POST'])
def create_need():
    data = request.get_json()
    new_need = {
        "ngo_id": data.get('ngo_id'),
        "category": data.get('category'),
        "portions_needed": data.get('portions_needed'),
        "status": "active",
        "created_at": datetime.datetime.utcnow()
    }
    result = db.ngo_needs.insert_one(new_need)
    return jsonify({"message": "Need created", "id": str(result.inserted_id)}), 201

@needs_bp.route('/', methods=['GET'])
def get_needs():
    needs = list(db.ngo_needs.find({"status": "active"}))
    for n in needs:
        n['_id'] = str(n['_id'])
    return jsonify(needs), 200
