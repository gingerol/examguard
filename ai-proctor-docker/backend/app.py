from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import numpy as np
from eye_tracker import get_eye_status # Assumes eye_tracker.py is in the same directory
from face_detector import get_face_detector, find_faces # Assumes face_detector.py is in the same directory
from face_landmarks import get_landmark_model, detect_marks # Assumes face_landmarks.py is in the same directory
import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity

app = Flask(__name__)
CORS(app)

# Configure JWT
app.config["JWT_SECRET_KEY"] = os.environ.get('FLASK_JWT_SECRET_KEY', 'super-secret-dev-key') # Change this in production!
jwt = JWTManager(app)

# Initialize MongoDB client
# Ensure MONGO_URI is set in your environment variables for Docker
mongo_uri = os.environ.get('MONGO_URI', 'mongodb://mongodb:27017/')
client = MongoClient(mongo_uri)
db = client.proctoring_db
events_collection = db.proctoring_events
users_collection = db.users

# Initialize face detection models
# These will be initialized when the Docker container starts.
# Ensure that any model files required by these functions are included in the Docker image
# and paths are correctly referenced.
face_model = get_face_detector()
landmark_model = get_landmark_model()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "AI Proctoring system is running"})

@app.route('/api/analyze-face', methods=['POST'])
def analyze_face():
    print("[INFO] /api/analyze-face endpoint hit", flush=True)
    if 'image' not in request.files:
        print("[ERROR] No image provided in request", flush=True)
        # Log event for no image provided - though client should prevent this
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    # Get session_id from form data
    session_id = request.form.get('session_id', f'unknown_session_{datetime.datetime.utcnow().timestamp()}')
    
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    faces = find_faces(img, face_model)
    
    if len(faces) == 0:
        event_data = {
            "timestamp": datetime.datetime.utcnow(),
            "session_id": session_id,
            "event_type": "no_face_detected",
            "details": "No face was detected in the provided image."
        }
        events_collection.insert_one(event_data)
        return jsonify({"error": "No face detected"}), 400
    
    # Prepare base event data for face analysis
    base_event_data = {
        "timestamp": datetime.datetime.utcnow(),
        "session_id": session_id,
    }

    if len(faces) > 1:
        event_data_multi_face = {
            **base_event_data,
            "event_type": "multiple_faces_detected",
            "details": f"Multiple faces ({len(faces)}) detected. Proceeding with analysis of the first face."
        }
        events_collection.insert_one(event_data_multi_face)
        # For simplicity, taking the first detected face if multiple are present
        # The original guide implies handling multiple faces as a warning, which is good.
        # jsonify({"warning": "Multiple faces detected", "count": len(faces)}), 200
        # For now, let's proceed with the first face for analysis, but this can be refined.
        pass # Let it proceed with the first face for now.

    face = faces[0] # Process the first detected face
    marks = detect_marks(img, landmark_model, face)
    eye_status = get_eye_status(marks)
    
    # Log face analyzed event
    analyzed_event_data = {
        **base_event_data, # uses the timestamp from when analysis started
        "event_type": "face_analyzed",
        "details": {
            "eye_status": eye_status,
            "looking_away": eye_status != "forward",
            "face_count": len(faces) # Log the actual number of faces detected
        }
    }
    events_collection.insert_one(analyzed_event_data)

    # Constructing response based on the original guide's details
    response_data = {
        "face_detected": True,
        "eye_status": eye_status,
        "looking_away": eye_status != "forward" # Assuming "forward" is the desired state
    }
    if len(faces) > 1:
        response_data["warning_multiple_faces"] = f"Multiple faces ({len(faces)}) detected, analyzed first one."

    return jsonify(response_data)

@app.route('/api/events', methods=['GET'])
def get_events():
    session_id = request.args.get('session_id')
    limit = request.args.get('limit', default=50, type=int) # Default to 50 events, allow override

    query = {}
    if session_id:
        query['session_id'] = session_id

    # Fetch events, sort by timestamp descending, limit results
    # Convert ObjectId to string for JSON serialization if needed, but pymongo handles datetime well.
    # For _id, if you plan to use it on the client, convert it: str(event['_id'])
    events = []
    for event in events_collection.find(query).sort("timestamp", -1).limit(limit):
        event['_id'] = str(event['_id']) # Convert ObjectId to string
        if isinstance(event.get('timestamp'), datetime.datetime):
            event['timestamp'] = event['timestamp'].isoformat() # Convert datetime to ISO string
        events.append(event)
    
    return jsonify(events)

# Note: The if __name__ == '__main__': block is typically for direct execution (python app.py)
# When using Gunicorn (as planned for Docker), Gunicorn itself will run the Flask app object.
# So, this block won't be executed by Gunicorn, but it's fine to keep for local dev/testing.
if __name__ == '__main__':
    # For local testing, you might need to ensure model files are found.
    # The paths in face_detector.py, face_landmarks.py might need adjustment for local run vs Docker.
    app.run(host='0.0.0.0', port=5000, debug=True) # debug=True for local dev 