from flask import Blueprint, request, jsonify
from db import db
from bson import ObjectId
import datetime

food_bp = Blueprint('food', __name__)

@food_bp.route('/', methods=['POST'])
def create_listing():
    data = request.get_json()
    new_listing = {
        "name": data.get('name'),
        "category": data.get('category'),
        "portions": data.get('portions'),
        "expiry": data.get('expiry'),
        "status": "available",
        "created_at": datetime.datetime.utcnow()
    }
    result = db.food_listings.insert_one(new_listing)
    return jsonify({"message": "Listing created", "id": str(result.inserted_id)}), 201

@food_bp.route('/', methods=['GET'])
def get_listings():
    listings = list(db.food_listings.find({"status": "available"}))
    for lst in listings:
        lst['_id'] = str(lst['_id'])
    return jsonify(listings), 200
