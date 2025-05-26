from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import os
import cv2
import numpy as np
from eye_tracker import get_eye_status # Assumes eye_tracker.py is in the same directory
from face_detector import get_face_detector, find_faces # Assumes face_detector.py is in the same directory
from face_landmarks import get_landmark_model, detect_marks # Assumes face_landmarks.py is in the same directory
import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity, get_jwt
import base64 # Added import

app = Flask(__name__)
CORS(app)

# Configure JWT
app.config["JWT_SECRET_KEY"] = os.environ.get('FLASK_JWT_SECRET_KEY', 'super-secret-dev-key') # Change this in production!
jwt = JWTManager(app)

# Initialize MongoDB client
# Ensure MONGO_URI is set in your environment variables for Docker
# mongo_uri = os.environ.get('MONGO_URI', 'mongodb://mongodb:27017/')
mongo_uri = os.environ.get('MONGO_URI')
if not mongo_uri:
    # This will cause the backend to fail loudly on startup if MONGO_URI is not set
    print("[FATAL ERROR] MONGO_URI environment variable not set!", flush=True)
    raise RuntimeError("MONGO_URI environment variable not set!")
else:
    print(f"[INFO] Attempting to connect to MongoDB with URI: {mongo_uri}", flush=True)

client = MongoClient(mongo_uri)
# db = client.proctoring_db # Original line
# If MONGO_URI includes the database name (e.g., from docker-compose), 
# client.get_default_database() will use it. Otherwise, you need to specify.
# Let's use get_default_database() as suggested by the docker-compose comment
db = client.get_default_database() 
print(f"[INFO] Connected to MongoDB, selected database: {db.name}", flush=True)

events_collection = db.proctoring_events
users_collection = db.users

# Initialize face detection models
# These will be initialized when the Docker container starts.
# Ensure that any model files required by these functions are included in the Docker image
# and paths are correctly referenced.
face_model = get_face_detector()
landmark_model = get_landmark_model()

@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'student') # Default role to 'student'

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400

    if users_collection.find_one({"username": username}):
        return jsonify({"msg": "Username already exists"}), 409 # 409 Conflict

    hashed_password = generate_password_hash(password)
    new_user = {
        "username": username,
        "password_hash": hashed_password,
        "role": role
    }
    users_collection.insert_one(new_user)
    return jsonify({"msg": "User created successfully"}), 201

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400

    user = users_collection.find_one({"username": username})

    if user and check_password_hash(user['password_hash'], password):
        # Include user's role in the JWT claims
        additional_claims = {"role": user.get("role", "student")} 
        access_token = create_access_token(identity=username, additional_claims=additional_claims)
        return jsonify(access_token=access_token, username=username, role=user.get("role", "student")), 200
    else:
        return jsonify({"msg": "Bad username or password"}), 401

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "AI Proctoring system is running"})

@app.route('/api/analyze-face', methods=['POST'])
@jwt_required()
def analyze_face():
    current_user_identity = get_jwt_identity()
    print(f"[INFO] /api/analyze-face endpoint hit by user: {current_user_identity}", flush=True)
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
            "username": current_user_identity,
            "event_type": "no_face_detected",
            "details": "No face was detected in the provided image."
        }
        events_collection.insert_one(event_data)
        return jsonify({"error": "No face detected"}), 400
    
    # Prepare base event data for face analysis
    base_event_data = {
        "timestamp": datetime.datetime.utcnow(),
        "session_id": session_id,
        "username": current_user_identity
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
        **base_event_data, # uses the timestamp and username from when analysis started
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
@jwt_required()
def get_events():
    # Get user claims from the JWT
    # The role was stored in additional_claims when the token was created
    # We can access it via get_jwt() function
    claims = get_jwt()
    user_role = claims.get("role", "student") # Default to student if role somehow missing

    if user_role != 'admin':
        return jsonify({"msg": "Administration rights required to access event logs."}), 403 # Forbidden

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

@app.route('/api/analyze-audio', methods=['POST', 'OPTIONS'])
@cross_origin(origins="http://localhost:3001", methods=['POST', 'OPTIONS'], headers=['Content-Type', 'Authorization'], supports_credentials=True)
@jwt_required()
def analyze_audio_chunk():
    # Handle OPTIONS request explicitly for preflight
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()

    # Existing POST logic
    current_user_identity = get_jwt_identity()
    print(f"[INFO] /api/analyze-audio endpoint hit by user: {current_user_identity}", flush=True)
    
    # Ensure the request has a JSON body
    if not request.is_json:
        print("[ERROR] /api/analyze-audio: Missing JSON in request", flush=True)
        return jsonify({"msg": "Missing JSON in request"}), 400

    data = request.get_json()
    audio_chunk_base64 = data.get('audio_chunk_base64')
    sample_rate = data.get('sample_rate')
    session_id = data.get('session_id', f'unknown_session_{datetime.datetime.utcnow().timestamp()}') # Added default for session_id
    client_timestamp_utc = data.get('client_timestamp_utc', datetime.datetime.utcnow().isoformat()) # Added default for timestamp

    if not audio_chunk_base64 or sample_rate is None: # sample_rate can be 0, so check for None
        print("[ERROR] /api/analyze-audio: Missing audio_chunk_base64 or sample_rate in JSON payload", flush=True)
        return jsonify({"msg": "Missing audio_chunk_base64 or sample_rate"}), 400

    # Minimal processing for now: Log reception and key data points
    print(f"[AUDIO_CHUNK_RECEIVED] Session: {session_id}, Sample Rate: {sample_rate}, Timestamp (Client UTC): {client_timestamp_utc}, Chunk Base64 Length: {len(audio_chunk_base64)}", flush=True)
    
    # Decode Base64 audio and save to file for verification
    try:
        audio_bytes = base64.b64decode(audio_chunk_base64)
        
        # Create a directory for audio chunks if it doesn't exist
        audio_chunks_dir = "/app/audio_chunks"
        os.makedirs(audio_chunks_dir, exist_ok=True)
        
        # Sanitize client_timestamp_utc for filename (replace colons, etc.)
        safe_timestamp = client_timestamp_utc.replace(":", "-").replace(".", "-")
        filename = f"{session_id}_{safe_timestamp}.wav"
        filepath = os.path.join(audio_chunks_dir, filename)
        
        with open(filepath, 'wb') as f_audio:
            f_audio.write(audio_bytes)
        print(f"[AUDIO_CHUNK_SAVED] Audio chunk saved to {filepath}", flush=True)

        # Log event to MongoDB
        try:
            # Calculate approximate duration. Assuming 16-bit mono audio (2 bytes per sample)
            # This might not be perfectly accurate if WAV header is different, but good for an estimate
            # Or, more simply, we know the frontend aims for 5 seconds.
            approx_duration = 5.0 # Based on TARGET_AUDIO_CHUNK_DURATION_SECONDS in frontend

            event_data = {
                "timestamp": datetime.datetime.utcnow(), # Server-side timestamp
                "session_id": session_id,
                "username": current_user_identity,
                "event_type": "audio_chunk_saved",
                "details": {
                    "client_timestamp_utc": client_timestamp_utc,
                    "sample_rate": sample_rate,
                    "original_chunk_base64_length": len(audio_chunk_base64),
                    "saved_filepath": filepath,
                    "approx_chunk_duration_seconds": approx_duration
                }
            }
            events_collection.insert_one(event_data)
            print(f"[DB_EVENT] Logged 'audio_chunk_saved' event for session {session_id}", flush=True)
        except Exception as db_e:
            print(f"[ERROR] Failed to log 'audio_chunk_saved' event to MongoDB: {db_e}", flush=True)

    except Exception as e:
        print(f"[ERROR] Failed to decode or save audio chunk: {e}", flush=True)
        # Optionally, you could return an error response to the client here
        # For now, we'll let it proceed to the main success response even if file saving fails
        pass

    # TODO: Implement actual audio analysis logic here
    # - Process WAV bytes (e.g., with librosa, webrtcvad, etc.)

    return jsonify({"message": "Audio chunk received and logged by backend (actual analysis pending).", "session_id": session_id}), 200

def _build_cors_preflight_response():
    response = jsonify({'message': 'CORS preflight successful'})
    # These headers are often managed by Flask-CORS with @cross_origin, 
    # but explicitly setting them here for an OPTIONS handler can sometimes help.
    # However, with @cross_origin, this explicit handler might not even be strictly necessary
    # if Flask-CORS correctly handles the OPTIONS method added to @app.route.
    # For now, let's keep it simple and rely on @cross_origin to add the headers.
    # If issues persist, we can add them manually:
    # response.headers.add("Access-Control-Allow-Origin", "http://localhost:3001")
    # response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
    # response.headers.add('Access-Control-Allow-Methods', "POST,OPTIONS")
    # response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Note: The if __name__ == '__main__': block is typically for direct execution (python app.py)
# When using Gunicorn (as planned for Docker), Gunicorn itself will run the Flask app object.
# So, this block won't be executed by Gunicorn, but it's fine to keep for local dev/testing.
if __name__ == '__main__':
    # For local testing, you might need to ensure model files are found.
    # The paths in face_detector.py, face_landmarks.py might need adjustment for local run vs Docker.
    print("[INFO] Flask development server starting... (Not for production)", flush=True)
    app.run(host='0.0.0.0', port=5000, debug=True) # debug=True for local dev 