import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/foodbridge")
    JWT_SECRET = os.getenv("JWT_SECRET", "default_secret")
    PORT = int(os.getenv("PORT", 5000))
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
