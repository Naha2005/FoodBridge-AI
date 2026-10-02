from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.auth import auth_bp
from routes.food import food_bp
from routes.needs import needs_bp
from routes.agent import agent_bp
from routes.ml import ml_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(food_bp, url_prefix='/api/food')
    app.register_blueprint(needs_bp, url_prefix='/api/needs')
    app.register_blueprint(agent_bp, url_prefix='/api/agent')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=Config.PORT, debug=True)
