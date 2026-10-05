"""
FoodBridge AI — Flask Application Entry Point
"""
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.auth import auth_bp
from routes.food import food_bp
from routes.needs import needs_bp
from routes.agent import agent_bp
from routes.ml import ml_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow frontend dev server and production origins
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })

    app.register_blueprint(auth_bp,  url_prefix="/api/auth")
    app.register_blueprint(food_bp,  url_prefix="/api/food")
    app.register_blueprint(needs_bp, url_prefix="/api/needs")
    app.register_blueprint(agent_bp, url_prefix="/api/agent")
    app.register_blueprint(ml_bp,    url_prefix="/api/ml")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "version": "2.0.0"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
