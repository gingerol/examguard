"""
Simple Flask app for Railway deployment detection
This imports and runs the actual ExamGuard application
"""

import sys
import os

# Add the actual application directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-proctor-docker', 'backend'))

# Import the actual Flask application
try:
    from app import app
    
    if __name__ == "__main__":
        port = int(os.environ.get("PORT", 5000))
        app.run(host="0.0.0.0", port=port, debug=False)
except ImportError as e:
    print(f"Error importing main app: {e}")
    # Fallback simple Flask app for Railway detection
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def hello():
        return "ExamGuard Backend - Import Error. Check logs."
    
    @app.route('/health')
    def health():
        return {"status": "error", "message": "Main app import failed"}
    
    if __name__ == "__main__":
        port = int(os.environ.get("PORT", 5000))
        app.run(host="0.0.0.0", port=port, debug=False)