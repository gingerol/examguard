"""
Simple Flask app for Railway debugging
This will help us identify what's preventing the main app from starting
"""

import os
import sys
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({
        "status": "running",
        "message": "Simple app is working",
        "python_version": sys.version,
        "working_directory": os.getcwd(),
        "files_in_root": os.listdir('.'),
        "env_vars": {
            "PORT": os.environ.get('PORT'),
            "FLASK_ENV": os.environ.get('FLASK_ENV'),
            "MONGO_URI": "set" if os.environ.get('MONGO_URI') else "not set"
        }
    })

@app.route('/health')
def health():
    # Try to import the main app and report what happens
    import_status = {}
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-proctor-docker', 'backend'))
        import_status['path_added'] = True
        
        # Check if required files exist
        backend_path = os.path.join(os.path.dirname(__file__), 'ai-proctor-docker', 'backend')
        import_status['backend_exists'] = os.path.exists(backend_path)
        import_status['app_py_exists'] = os.path.exists(os.path.join(backend_path, 'app.py'))
        
        if import_status['backend_exists']:
            import_status['backend_files'] = os.listdir(backend_path)[:10]  # First 10 files
        
        # Try importing specific modules to identify issues
        try:
            import flask
            import_status['flask'] = 'ok'
        except Exception as e:
            import_status['flask'] = str(e)
            
        try:
            import cv2
            import_status['cv2'] = 'ok'
        except Exception as e:
            import_status['cv2'] = str(e)
            
        try:
            import tensorflow
            import_status['tensorflow'] = 'ok'
        except Exception as e:
            import_status['tensorflow'] = str(e)
        
        try:
            from app import app as main_app
            import_status['main_app'] = 'imported successfully'
        except Exception as e:
            import_status['main_app_error'] = str(e)
            import traceback
            import_status['traceback'] = traceback.format_exc()
            
    except Exception as e:
        import_status['error'] = str(e)
    
    return jsonify({
        "status": "ok",
        "message": "Simple app health check",
        "import_diagnostics": import_status
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[SIMPLE APP] Starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)