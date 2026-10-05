import os
import datetime
import bcrypt
from db import db

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed_data():
    print("Clearing existing data...")
    db.users.delete_many({})
    db.food_listings.delete_many({})
    db.ngo_needs.delete_many({})
    db.agent_recommendations.delete_many({})

    # 1. Add Demo Users
    print("Adding demo users...")
    donor_id = db.users.insert_one({
        "name": "The Grand Hotel",
        "email": "hotel@demo.com",
        "password": hash_pw("password123"),
        "role": "donor",
        "org_name": "Grand Hotel Catering",
        "status": "active"
    }).inserted_id

    donor_id_2 = db.users.insert_one({
        "name": "Fresh Bakery",
        "email": "bakery@demo.com",
        "password": hash_pw("password123"),
        "role": "donor",
        "org_name": "Fresh Bakery Co",
        "status": "active"
    }).inserted_id

    ngo_id_1 = db.users.insert_one({
        "name": "City Food Bank",
        "email": "ngo1@demo.com",
        "password": hash_pw("password123"),
        "role": "ngo",
        "org_name": "City Food Bank",
        "status": "active",
        "lat": 12.9716, 
        "lng": 77.5946,
        "capacity_pct": 40
    }).inserted_id

    ngo_id_2 = db.users.insert_one({
        "name": "Hope Foundation",
        "email": "ngo2@demo.com",
        "password": hash_pw("password123"),
        "role": "ngo",
        "org_name": "Hope Foundation",
        "status": "active",
        "lat": 12.9352,
        "lng": 77.6245,
        "capacity_pct": 70
    }).inserted_id
    
    ngo_id_3 = db.users.insert_one({
        "name": "Care & Share",
        "email": "ngo3@demo.com",
        "password": hash_pw("password123"),
        "role": "ngo",
        "org_name": "Care & Share Org",
        "status": "active",
        "lat": 12.9555,
        "lng": 77.6000,
        "capacity_pct": 20
    }).inserted_id

    volunteer_id = db.users.insert_one({
        "name": "John Volunteer",
        "email": "volunteer@demo.com",
        "password": hash_pw("password123"),
        "role": "volunteer",
        "status": "active"
    }).inserted_id

    # 2. Add 5 NGO Needs
    print("Adding NGO needs...")
    needs = [
        {"ngo_id": str(ngo_id_1), "category": "Cooked Meals", "portions_needed": 100, "urgency": 4, "status": "active"},
        {"ngo_id": str(ngo_id_2), "category": "Raw Vegetables", "portions_needed": 50, "urgency": 2, "status": "active"},
        {"ngo_id": str(ngo_id_3), "category": "Bread & Bakery", "portions_needed": 30, "urgency": 3, "status": "active"},
        {"ngo_id": str(ngo_id_1), "category": "Fruits", "portions_needed": 80, "urgency": 2, "status": "active"},
        {"ngo_id": str(ngo_id_2), "category": "Dairy", "portions_needed": 20, "urgency": 4, "status": "active"}
    ]
    for n in needs:
        n["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        db.ngo_needs.insert_one(n)

    # 3. Add 5 Food Listings (Donations)
    print("Adding food listings...")
    now = datetime.datetime.now(datetime.timezone.utc)
    
    donations = [
        # 1. Available Donation (Urgent)
        {
            "donor_id": donor_id,
            "name": "Buffet Leftovers (Rice & Curry)",
            "category": "Cooked Meals",
            "quantity": 40,
            "unit": "portions",
            "storage": "Room Temperature",
            "expiry_time": now + datetime.timedelta(hours=4), # Expiring in 4h -> Urgent
            "lat": 12.9720,
            "lng": 77.5950,
            "status": "available",
            "created_at": now
        },
        # 2. Available Donation (Not Urgent)
        {
            "donor_id": donor_id_2,
            "name": "Excess Bread Rolls",
            "category": "Bread & Bakery",
            "quantity": 100,
            "unit": "items",
            "storage": "Room Temperature",
            "expiry_time": now + datetime.timedelta(hours=48),
            "lat": 12.9600,
            "lng": 77.6000,
            "status": "available",
            "created_at": now
        },
        # 3. Available Donation (Refrigerated)
        {
            "donor_id": donor_id,
            "name": "Apples and Oranges",
            "category": "Fruits",
            "quantity": 15,
            "unit": "kg",
            "storage": "Refrigerated",
            "expiry_time": now + datetime.timedelta(hours=72),
            "lat": 12.9720,
            "lng": 77.5950,
            "status": "available",
            "created_at": now
        },
        # 4. Matched Donation
        {
            "donor_id": donor_id_2,
            "name": "Fresh Bread Batches",
            "category": "Bread & Bakery",
            "quantity": 30,
            "unit": "packs",
            "storage": "Room Temperature",
            "expiry_time": now + datetime.timedelta(days=2),
            "lat": 12.9600,
            "lng": 77.6000,
            "status": "matched",
            "matched_ngo_id": str(ngo_id_1),
            "matched_ngo_name": "City Food Bank",
            "created_at": now - datetime.timedelta(hours=1),
            "updated_at": now
        },
        # 5. Delivered Donation (for impact stats)
        {
            "donor_id": donor_id,
            "name": "Assorted Fruits",
            "category": "Fruits",
            "quantity": 25,
            "unit": "kg",
            "storage": "Refrigerated",
            "expiry_time": now + datetime.timedelta(days=5),
            "status": "delivered",
            "matched_ngo_id": str(ngo_id_2),
            "matched_ngo_name": "Hope Foundation",
            "delivered_by": str(volunteer_id),
            "created_at": now - datetime.timedelta(days=1),
            "updated_at": now - datetime.timedelta(hours=2)
        }
    ]
    for d in donations:
        db.food_listings.insert_one(d)

    print("Seed complete! You can now log in with the demo accounts:")
    print("Donor 1: hotel@demo.com")
    print("Donor 2: bakery@demo.com")
    print("NGO 1: ngo1@demo.com")
    print("NGO 2: ngo2@demo.com")
    print("NGO 3: ngo3@demo.com")
    print("Password for all: password123")

if __name__ == "__main__":
    seed_data()
