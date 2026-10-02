from flask import Blueprint, request, jsonify
from config import Config
from groq import Groq

agent_bp = Blueprint('agent', __name__)

client = None
if Config.GROQ_API_KEY:
    client = Groq(api_key=Config.GROQ_API_KEY)

@agent_bp.route('/chat', methods=['POST'])
def chat():
    if not client:
        return jsonify({"reply": "AI Agent is not configured (missing API key). Please configure it in .env"}), 200
    
    data = request.get_json()
    user_message = data.get('message', '')
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are the FoodBridge AI assistant, helping with food redistribution to achieve Zero Hunger."
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            model="llama3-8b-8192",
        )
        return jsonify({"reply": chat_completion.choices[0].message.content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
