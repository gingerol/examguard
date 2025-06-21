"""
ExamGuard Railway Deployment Entry Point
This imports and runs the actual ExamGuard application with proper error handling
"""

import sys
import os

# Add the actual application directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-proctor-docker', 'backend'))

# Set required environment variables with defaults for Railway
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('JWT_SECRET_KEY', 'railway-production-secret-key-change-me')
os.environ.setdefault('MONGO_URI', 'mongodb://localhost:27017/examguard_production')

# Import the actual Flask application
try:
    print("[RAILWAY] Attempting to import main application...")
    from app import app, socketio
    print("[RAILWAY] Successfully imported Flask app and SocketIO")
    
    if __name__ == "__main__":
        port = int(os.environ.get("PORT", 5000))
        print(f"[RAILWAY] Starting ExamGuard on port {port}")
        print(f"[RAILWAY] Environment: {os.environ.get('FLASK_ENV', 'not set')}")
        print(f"[RAILWAY] MongoDB URI: {os.environ.get('MONGO_URI', 'not set')}")
        
        # Use SocketIO run method for proper WebSocket support
        socketio.run(app, host="0.0.0.0", port=port, debug=False)
        
except ImportError as e:
    print(f"[RAILWAY ERROR] Error importing main app: {e}")
    import traceback
    traceback.print_exc()
    
    # Fallback simple Flask app for Railway detection
    from flask import Flask, jsonify
    app = Flask(__name__)
    
    @app.route('/')
    def hello():
        return "ExamGuard Backend - Import Error. Check Railway logs for details."
    
    @app.route('/health')
    def health():
        return jsonify({"status": "error", "message": "Main app import failed", "error": str(e)})
    
    @app.route('/api/health')
    def api_health():
        return jsonify({"status": "error", "message": "Main app import failed", "error": str(e)})
    
    if __name__ == "__main__":
        port = int(os.environ.get("PORT", 5000))
        print(f"[RAILWAY FALLBACK] Starting fallback app on port {port}")
        app.run(host="0.0.0.0", port=port, debug=False)