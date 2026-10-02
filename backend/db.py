from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from config import Config

def init_db():
    try:
        client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
        # Attempt to connect
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        return client.foodbridge
    except ConnectionFailure as e:
        print(f"Could not connect to MongoDB: {e}")
        return None

db = init_db()
