from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import os
import cv2
import numpy as np
from eye_tracker import get_eye_status # Assumes eye_tracker.py is in the same directory
from face_detector import get_face_detector, find_faces # Assumes face_detector.py is in the same directory
from face_landmarks import get_landmark_model, detect_marks # Assumes face_landmarks.py is in the same directory
import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity, get_jwt
import base64 # Added import
import io # Added import
import librosa # Added import
import eventlet # Added eventlet import
import uuid # NEW: For generating unique alert IDs
import math # NEW: For pagination (math.ceil)

eventlet.monkey_patch() # Recommended for eventlet

app = Flask(__name__)

# Simpler global CORS setup first, then can make it more specific if this works.
# This allows all origins, all headers, all methods for all routes.
# We can then restrict it once we confirm OPTIONS works.
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"], supports_credentials=True, expose_headers=["Content-Type", "Authorization"])

# Old more specific CORS, commented out for now:
# CORS(app, 
#      resources={
#          r"/api/*": {
#              "origins": "http://localhost:3003",
#              "allow_headers": ["Content-Type", "Authorization"],
#              "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#              "supports_credentials": True
#          }
#      }
# )

# Initialize SocketIO
# Allowing all origins for SocketIO for development, can be tightened later.
socketio = SocketIO(app, cors_allowed_origins="*")

# Define the directory where audio chunks are stored
AUDIO_CHUNK_DIR = '/app/audio_chunks' # Use absolute path directly
SNAPSHOT_DIR = '/app/snapshots' # NEW: Directory for storing snapshots
# Attempt to create the directory on app startup
try:
    os.makedirs(AUDIO_CHUNK_DIR, exist_ok=True)
    os.makedirs(SNAPSHOT_DIR, exist_ok=True) # NEW: Create snapshot directory
    print(f"[INFO] Ensured audio chunk directory exists: {AUDIO_CHUNK_DIR}", flush=True)
    print(f"[INFO] Ensured snapshot directory exists: {SNAPSHOT_DIR}", flush=True)
except OSError as e:
    print(f"[ERROR] Could not create audio chunk or snapshot directory: {e}", flush=True)
    # Depending on the severity, you might want to raise the error or handle it

# Threshold for loud noise detection (in dBFS)
# This can be tuned based on testing. Values closer to 0 are louder.
LOUD_NOISE_DBFS_THRESHOLD = -20.0

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
alerts_collection = db.alerts # NEW: For storing detailed alerts

# Initialize face detection models
# These will be initialized when the Docker container starts.
# Ensure that any model files required by these functions are included in the Docker image
# and paths are correctly referenced.
face_model = get_face_detector()
landmark_model = get_landmark_model()

# Placeholder for active sessions store (Task 3.2.1)
active_sessions_store = {}

# Placeholder for admin SIDs or room (Task 3.4.2)
admin_dashboard_room = "admin_dashboard_room"

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
    print(f"[DEBUG_ANALYZE_FACE] Endpoint hit by user: {current_user_identity}", flush=True)
    
    if 'image' not in request.files:
        print("[DEBUG_ANALYZE_FACE] 'image' not in request.files", flush=True)
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    session_id = request.form.get('session_id')

    if not file.filename: # Check if a file was actually uploaded
        print("[DEBUG_ANALYZE_FACE] No selected file or empty filename.", flush=True)
        return jsonify({"error": "No selected file"}), 400

    if not session_id:
        print(f"[DEBUG_ANALYZE_FACE] session_id missing for user {current_user_identity}", flush=True)
        return jsonify({"error": "session_id is required"}), 400

    print(f"[DEBUG_ANALYZE_FACE] Received file: {file.filename}, Content-Type: {file.content_type}, Session ID: {session_id}", flush=True)

    img_bytes = file.read()
    
    # Save the received image for debugging
    debug_image_filename = f"debug_{session_id}_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.jpg"
    debug_image_path = os.path.join(SNAPSHOT_DIR, debug_image_filename)
    try:
        with open(debug_image_path, 'wb') as f:
            f.write(img_bytes)
        print(f"[DEBUG_ANALYZE_FACE] Saved received image to: {debug_image_path}", flush=True)
    except Exception as e:
        print(f"[DEBUG_ANALYZE_FACE] Error saving debug image: {e}", flush=True)

    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        print("[DEBUG_ANALYZE_FACE] cv2.imdecode failed, img is None. The image data might be corrupted or not a valid image format.", flush=True)
        # Also log the first few bytes to see if it looks like a JPEG
        print(f"[DEBUG_ANALYZE_FACE] First 100 bytes of received data: {img_bytes[:100]}", flush=True)
        return jsonify({"error": "Failed to decode image. It might be corrupted or not a valid format."}), 400
    
    print(f"[DEBUG_ANALYZE_FACE] Image decoded successfully. Shape: {img.shape}", flush=True)

    # Default response_data, to be updated in success cases
    response_data = {"error": "Initial processing error", "face_detected": False}

    try:
        faces = find_faces(img, face_model)
        print(f"[DEBUG_ANALYZE_FACE] find_faces result: {faces}", flush=True)
        
        is_alert = False
        alert_details = {}
        current_status_for_dashboard = "Unknown"
        snapshot_filename_for_alert = None


        if len(faces) == 0:
            current_status_for_dashboard = "No Face Detected"
            is_alert = True
            alert_details = {"type": "no_face_detected", "message": "No face was detected."}
            response_data = {"face_detected": False, "eye_status": "N/A", "looking_away": False, "error": "No face detected"}
            print("[DEBUG_ANALYZE_FACE] Condition: No face detected.", flush=True)
        else:
            base_event_data = {
                "timestamp": datetime.datetime.utcnow(),
                "session_id": session_id,
                "username": current_user_identity
            }
            if len(faces) > 1:
                current_status_for_dashboard = "Multiple Faces Detected"
                is_alert = True # This should be set before alert_details for this case
                alert_details = {"type": "multiple_faces_detected", "message": f"Multiple faces ({len(faces)}) detected."}
                # The original code analyzed the first face even if multiple were detected.
                # We'll keep that behavior but ensure the alert is for multiple faces.
            
            face = faces[0] # Analyze the first detected face
            marks = detect_marks(img, landmark_model, face)
            eye_status = get_eye_status(marks)
            
            # Update current_status_for_dashboard based on single face analysis if not already set by multiple_faces
            if not is_alert: # Only update if not already a multiple_faces alert
                 current_status_for_dashboard = eye_status if eye_status else "Face Detected"

            print(f"[DEBUG_ANALYZE_FACE] Face detected. Eye status: {eye_status}", flush=True)

            if eye_status != "forward" and eye_status is not None :
                if not is_alert: # Don't overwrite multiple_faces alert
                    is_alert = True
                    current_status_for_dashboard = f"Looking Away ({eye_status})"
                    alert_details = {"type": "looking_away", "message": f"Student may be looking away: {eye_status}"}

            analyzed_event_data = {
                **base_event_data,
                "event_type": "face_analyzed",
                "details": {"eye_status": eye_status, "looking_away": eye_status != "forward", "face_count": len(faces)}
            }
            try:
                events_collection.insert_one(analyzed_event_data)
            except Exception as db_exc:
                print(f"[ERROR_ANALYZE_FACE] DB insert to events_collection failed: {db_exc}", flush=True)
                # import sys; import traceback; traceback.print_exc(file=sys.stderr) # For more detailed logs if needed on server
                return jsonify({"error": "Database error during event insertion.", "detail": str(db_exc)}), 500
            
            response_data = {"face_detected": True, "eye_status": eye_status, "looking_away": eye_status != "forward"}
            if len(faces) > 1: # This adds a warning if multiple faces, but still returns analysis of first.
                response_data["warning_multiple_faces"] = f"Multiple faces ({len(faces)}) detected, analyzed first one."

        if is_alert and session_id:
            alert_id = str(uuid.uuid4())
            # snapshot_filename_for_alert is already initialized to None

            # Save snapshot if img is valid and it's a relevant alert type
            if img is not None and alert_details.get("type") in ["no_face_detected", "multiple_faces_detected", "looking_away"]:
                snapshot_filename_for_alert = f"alert_{session_id}_{alert_id}.jpg"
                snapshot_path = os.path.join(SNAPSHOT_DIR, snapshot_filename_for_alert)
                try:
                    cv2.imwrite(snapshot_path, img)
                    print(f"[DEBUG_ANALYZE_FACE] Saved ALERT snapshot to: {snapshot_path}", flush=True)
                except Exception as e:
                    print(f"[DEBUG_ANALYZE_FACE] Error saving ALERT snapshot: {e}", flush=True)
                    snapshot_filename_for_alert = None # Ensure it's None if save fails

            alert_doc = {
                "_id": alert_id,
                "session_id": session_id,
                "username": current_user_identity,
                "timestamp": datetime.datetime.utcnow(),
                "alert_type": alert_details.get("type", "unknown_alert"),
                "message": alert_details.get("message", "An alert was triggered."),
                "details": alert_details, 
                "snapshot_filename": snapshot_filename_for_alert,
                "is_acknowledged": False 
            }
            try:
                alerts_collection.insert_one(alert_doc)
            except Exception as db_exc:
                print(f"[ERROR_ANALYZE_FACE] DB insert to alerts_collection failed: {db_exc}", flush=True)
                # import sys; import traceback; traceback.print_exc(file=sys.stderr) # For more detailed logs if needed on server
                return jsonify({"error": "Database error saving alert.", "detail": str(db_exc)}), 500

            print(f"[DEBUG_ANALYZE_FACE] Alert for {alert_details.get('message')} saved to DB with ID: {alert_id}. Emitting to admin.", flush=True)
            
            # Prepare a JSON-serializable version of the alert for Socket.IO
            alert_doc_for_emit = alert_doc.copy()
            if isinstance(alert_doc_for_emit.get('timestamp'), datetime.datetime):
                alert_doc_for_emit['timestamp'] = alert_doc_for_emit['timestamp'].isoformat()

            # Emit the new alert to the admin dashboard
            socketio.emit('new_alert', alert_doc_for_emit, room=admin_dashboard_room, namespace='/ws/admin_dashboard')
            alert_type_for_log = alert_details.get("type", "unknown_type") # Safer for logging
            print(f"[DEBUG_ANALYZE_FACE] Alert '{alert_type_for_log}' saved and emitted for session {session_id}", flush=True)

        # --- Update active_sessions_store ---
        session_entry = active_sessions_store.get(session_id)
        if session_entry: # Check if the session exists
            session_entry.update({
                "last_seen": datetime.datetime.utcnow().isoformat(),
                "last_face_analysis_status": current_status_for_dashboard,
                "last_alert_type": alert_details.get("type") if is_alert else session_entry.get("last_alert_type"),
                "last_alert_timestamp": datetime.datetime.utcnow().isoformat() if is_alert else session_entry.get("last_alert_timestamp"),
                "last_alert_snapshot": snapshot_filename_for_alert if is_alert and snapshot_filename_for_alert else session_entry.get("last_alert_snapshot")
            })
            session_entry["last_heartbeat_time"] = datetime.datetime.utcnow().isoformat()
            session_entry['last_event_timestamp'] = datetime.datetime.utcnow().isoformat() 

            updated_data_for_emit = { # This structure was simplified later, let's use session_entry directly
                "session_id": session_id,
                'data': session_entry 
            }
            socketio.emit('session_update', 
                          updated_data_for_emit,
                          room=admin_dashboard_room, namespace='/ws/admin_dashboard')
            print(f"[DEBUG_ANALYZE_FACE] Emitted session_update for {session_id}, user {session_entry['student_username']}", flush=True)
        else:
            print(f"[ERROR_ANALYZE_FACE] Session ID {session_id} not found in active_sessions_store. Cannot update. User: {current_user_identity}", flush=True)
            # This path does not return a 500, but response_data might still be the default error if this was the only path taken.
            # However, if session_id is valid, it should be in the store from start_monitoring_session.
            # If response_data wasn't updated due to this, it might return the default {"error": "Initial processing error"}
            # For safety, ensure response_data is appropriate if this is a terminal state for the request.
            if response_data.get("error") == "Initial processing error": # if not set by face logic
                 response_data = {"error": "Session not found in active store, analysis aborted before completion.", "session_id": session_id}


        return jsonify(response_data) # Normal successful return

    except Exception as e:
        # This will catch errors from CV functions (find_faces, detect_marks, get_eye_status) or any other unexpected logic errors.
        print(f"[CRITICAL_ERROR_ANALYZE_FACE] Unhandled exception in analyze_face main processing: {e}", flush=True)
        # For detailed debugging in Docker logs:
        # import sys
        # import traceback
        # traceback.print_exc(file=sys.stderr) # Or use app.logger.error with traceback
        return jsonify({"error": "An internal server error occurred during face analysis core processing.", "detail": str(e)}), 500

@app.route('/api/events', methods=['GET', 'OPTIONS'])
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
@jwt_required()
def analyze_audio_chunk():
    # Custom debug logging for OPTIONS handling
    if request.method == 'OPTIONS':
        print("[AUDIO_ANALYSIS_DEBUG] Request received for /api/analyze-audio. Method: OPTIONS", flush=True)
        # Log request headers for OPTIONS
        # headers_str = '\n'.join([f'{key}: {value}' for key, value in request.headers.items()])
        # print(f"[AUDIO_ANALYSIS_DEBUG] OPTIONS Request Headers:\n{headers_str}", flush=True)

        # Standard CORS preflight response
        response = jsonify({'message': 'CORS preflight for /api/analyze-audio successful'})
        # Flask-Cors should ideally handle these headers based on the global CORS config and @cross_origin
        # However, being explicit in an OPTIONS handler can be a fallback.
        # response.headers.add("Access-Control-Allow-Origin", "*") # Or your specific frontend origin
        # response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        # response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        # print(f"[AUDIO_ANALYSIS_DEBUG] OPTIONS Response Headers set (by explicit handler):\n{response.headers}", flush=True)
        # This explicit OPTIONS handler might conflict or be redundant if Flask-Cors is doing its job perfectly.
        # The logs show "[AUDIO_ANALYSIS_DEBUG] OPTIONS request explicitly handled in route. This is unusual."
        # This suggests that Flask-Cors might be trying to handle it, and then this also runs.
        # For now, we'll keep the explicit handling but rely on Flask-Cors to add the actual headers.
        return response, 200

    print("[AUDIO_ANALYSIS_DEBUG] Request received for /api/analyze-audio. Method: POST", flush=True)
    # headers_str = '\n'.join([f'{key}: {value}' for key, value in request.headers.items()])
    # print(f"[AUDIO_ANALYSIS_DEBUG] POST Request Headers:\n{headers_str}", flush=True)

    try:
        data = request.get_json()
        if not data:
            print("[AUDIO_ANALYSIS_ERROR] No JSON data received or failed to parse.", flush=True)
            return jsonify({"msg": "No JSON data received"}), 400

        session_id = data.get('session_id')
        audio_data_base64 = data.get('audio_data') # Expecting base64 encoded string
        
        print(f"[AUDIO_ANALYSIS_DEBUG] Received session_id: {session_id}", flush=True)
        if audio_data_base64:
            print(f"[AUDIO_ANALYSIS_DEBUG] Received audio_data (first 100 chars): {audio_data_base64[:100]}...", flush=True)
            print(f"[AUDIO_ANALYSIS_DEBUG] Type of audio_data: {type(audio_data_base64)}", flush=True)
        else:
            print("[AUDIO_ANALYSIS_WARNING] No audio_data in request payload.", flush=True)

        if not session_id:
            print("[AUDIO_ANALYSIS_ERROR] session_id is missing from request.", flush=True)
            return jsonify({"msg": "session_id is required"}), 400
        if not audio_data_base64:
            print("[AUDIO_ANALYSIS_ERROR] audio_data is missing from request.", flush=True)
            return jsonify({"msg": "audio_data is required"}), 400

        current_user = get_jwt_identity()
        print(f"[AUDIO_ANALYSIS_INFO] Processing audio for user: {current_user}, session: {session_id}", flush=True)

        # Ensure audio_files directory exists
        os.makedirs(AUDIO_CHUNK_DIR, exist_ok=True)
        
        # Decode Base64 audio data
        try:
            audio_bytes = base64.b64decode(audio_data_base64)
            print(f"[AUDIO_ANALYSIS_DEBUG] Successfully decoded base64 audio data. Bytes length: {len(audio_bytes)}", flush=True)
        except base64.binascii.Error as b64_error:
            print(f"[AUDIO_ANALYSIS_ERROR] Base64 decoding failed: {str(b64_error)}", flush=True)
            # import traceback
            # print(traceback.format_exc(), flush=True) # Temporarily add for more detail if needed
            return jsonify({"msg": "Invalid base64 audio data"}), 400
        except Exception as e:
            print(f"[AUDIO_ANALYSIS_ERROR] Unexpected error during base64 decode: {str(e)}", flush=True)
            import traceback
            print(traceback.format_exc(), flush=True)
            return jsonify({"msg": "Error decoding audio data"}), 500


        # Save the audio chunk to a temporary WAV file
        # Generate a unique filename to avoid collisions if multiple requests are processed concurrently.
        # Adding timestamp and random element for uniqueness.
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")
        random_suffix = uuid.uuid4().hex[:6]
        temp_audio_filename = f"temp_audio_chunk_{session_id}_{timestamp_str}_{random_suffix}.wav"
        temp_audio_filepath = os.path.join(AUDIO_CHUNK_DIR, temp_audio_filename)
        
        print(f"[AUDIO_ANALYSIS_DEBUG] Attempting to save decoded audio to: {temp_audio_filepath}", flush=True)
        try:
            with open(temp_audio_filepath, 'wb') as audio_file:
                audio_file.write(audio_bytes)
            print(f"[AUDIO_ANALYSIS_INFO] Audio chunk saved to {temp_audio_filepath}", flush=True)
        except IOError as io_err:
            print(f"[AUDIO_ANALYSIS_ERROR] Failed to write audio file {temp_audio_filepath}: {str(io_err)}", flush=True)
            # import traceback
            # print(traceback.format_exc(), flush=True)
            return jsonify({"msg": "Failed to save audio data for analysis"}), 500
        except Exception as e:
            print(f"[AUDIO_ANALYSIS_ERROR] Unexpected error saving audio file {temp_audio_filepath}: {str(e)}", flush=True)
            import traceback
            print(traceback.format_exc(), flush=True)
            return jsonify({"msg": "Unexpected error saving audio data"}), 500

        # Analyze the audio file for sound events
        # This function should return a list of detected event types or an empty list
        try:
            print(f"[AUDIO_ANALYSIS_DEBUG] Calling detect_sound_events for {temp_audio_filepath}", flush=True)
            detected_events = detect_sound_events(temp_audio_filepath) # from sound_event_detection.py
            print(f"[AUDIO_ANALYSIS_INFO] Detected sound events: {detected_events} in file {temp_audio_filepath}", flush=True)
        except Exception as e:
            print(f"[AUDIO_ANALYSIS_ERROR] Error during detect_sound_events for {temp_audio_filepath}: {str(e)}", flush=True)
            import traceback
            print(traceback.format_exc(), flush=True)
            # Clean up the temp file even if analysis fails
            if os.path.exists(temp_audio_filepath):
                try:
                    os.remove(temp_audio_filepath)
                    print(f"[AUDIO_ANALYSIS_DEBUG] Cleaned up temp audio file after error: {temp_audio_filepath}", flush=True)
                except Exception as rm_err:
                    print(f"[AUDIO_ANALYSIS_ERROR] Failed to cleanup temp audio file {temp_audio_filepath} after error: {str(rm_err)}", flush=True)
            return jsonify({"msg": f"Error analyzing audio: {str(e)}"}), 500
        finally:
            # Ensure the temporary file is deleted after analysis (or if an error occurs before this)
            # This finally block might be redundant if the specific error handling above also cleans up.
            if os.path.exists(temp_audio_filepath):
                try:
                    os.remove(temp_audio_filepath)
                    # print(f"[AUDIO_ANALYSIS_DEBUG] Cleaned up temp audio file: {temp_audio_filepath}", flush=True)
                except Exception as e:
                    print(f"[AUDIO_ANALYSIS_ERROR] Error cleaning up temp audio file {temp_audio_filepath}: {str(e)}", flush=True)
        
        # Process detected events: save alerts, emit SocketIO events, etc.
        # This part is similar to how face analysis alerts are handled.
        alert_details_list = []
        if detected_events:
            print(f"[AUDIO_ANALYSIS_INFO] Processing {len(detected_events)} detected audio events for session {session_id}.", flush=True)
            for event_type in detected_events:
                alert_id = str(uuid.uuid4())
                alert_data = {
                    "_id": alert_id,
                    "session_id": session_id,
                    "student_username": current_user,
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "alert_type": "audio_event",
                    "details": {
                        "event": event_type,
                        "description": f"Sound event detected: {event_type}",
                        "source_file": temp_audio_filename # Store the temp filename for reference if needed
                    },
                    "severity": "medium",  # Or determine severity based on event_type
                    "is_dismissed": False,
                    "snapshot_filename": None # No visual snapshot for audio events
                }
                try:
                    alerts_collection.insert_one(alert_data)
                    print(f"[AUDIO_ANALYSIS_INFO] Audio alert for event '{event_type}' (ID: {alert_id}) saved to DB for session {session_id}.", flush=True)
                    
                    # Prepare alert for SocketIO emission (without ObjectId for JSON serialization)
                    alert_for_socket = alert_data.copy()
                    # alert_for_socket['_id'] = str(alert_for_socket['_id']) # Already a string from uuid
                    
                    socketio.emit('new_alert', alert_for_socket, room=admin_dashboard_room, namespace='/ws/admin_dashboard')
                    print(f"[AUDIO_ANALYSIS_INFO] Emitted 'new_alert' via SocketIO for audio event '{event_type}' (Alert ID: {alert_id}) to admin dashboard for session {session_id}.", flush=True)
                    alert_details_list.append(alert_data['details'])
                except Exception as e:
                    print(f"[AUDIO_ANALYSIS_ERROR] Failed to save/emit audio alert for event '{event_type}' (session {session_id}): {str(e)}", flush=True)
                    import traceback
                    print(traceback.format_exc(), flush=True)
                    # Continue processing other events if one fails

            # Also update the main session document with the latest audio alert info
            update_session_with_event(session_id, "audio_event", {"last_audio_events": alert_details_list})
            print(f"[AUDIO_ANALYSIS_INFO] Updated session {session_id} with latest audio event details.", flush=True)
        else:
            print(f"[AUDIO_ANALYSIS_INFO] No significant sound events detected in chunk for session {session_id}.", flush=True)

        # Return a summary of detected events or a success message
        return jsonify({
            "msg": "Audio chunk analyzed successfully.",
            "session_id": session_id,
            "detected_events": detected_events, # List of event types
            "alerts_created": len(alert_details_list)
        }), 200

    except Exception as e:
        # This is a catch-all for any errors not caught by more specific handlers above
        # (e.g., issues with request.get_json(), unexpected errors before specific try-except blocks)
        print(f"[AUDIO_ANALYSIS_FATAL_ERROR] An unexpected error occurred in analyze_audio_chunk for session {session_id if 'session_id' in locals() else 'unknown'}: {str(e)}", flush=True)
        import traceback
        print(traceback.format_exc(), flush=True)
        return jsonify({"msg": "An unexpected error occurred during audio analysis.", "error": str(e)}), 500

@app.route('/api/audio_files/<path:filename>', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_audio_file(filename):
    claims = get_jwt()
    user_role = claims.get("role", "student")

    if user_role != 'admin':
        print(f"[AUTH_FAILURE] User {get_jwt_identity()} with role '{user_role}' attempted to access protected audio file: {filename}", flush=True)
        return jsonify({"msg": "Administration rights required to access audio files."}), 403

    # Basic security check to prevent directory traversal
    if '..' in filename or filename.startswith('/'):
        print(f"[SECURITY_WARNING] Invalid filename requested by admin {get_jwt_identity()}: {filename}", flush=True)
        return jsonify({"msg": "Invalid filename."}), 400
    
    print(f"[AUDIO_FILE_ACCESS] Admin {get_jwt_identity()} requesting audio file: {filename} from {AUDIO_CHUNK_DIR}", flush=True)
    try:
        return send_from_directory(AUDIO_CHUNK_DIR, filename, as_attachment=True)
    except FileNotFoundError:
        print(f"[AUDIO_FILE_ERROR] File not found: {filename} in {AUDIO_CHUNK_DIR}", flush=True)
        return jsonify({"msg": "Audio file not found."}), 404
    except Exception as e:
        print(f"[AUDIO_FILE_ERROR] Error serving file {filename}: {str(e)}", flush=True)
        return jsonify({"msg": "Error serving audio file."}), 500

@app.route('/api/admin/alerts', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_admin_alerts():
    # Explicitly handle OPTIONS requests first
    if request.method == 'OPTIONS':
        # This response should be simple and just acknowledge the preflight
        response = jsonify({'message': 'OPTIONS request successful for /api/admin/alerts'})
        # Flask-CORS should ideally handle adding all necessary headers, 
        # but we can be explicit for debugging or if it's missed.
        # response.headers.add('Access-Control-Allow-Origin', '*') # Or your specific frontend origin
        # response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        # response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        # response.headers.add('Access-Control-Allow-Credentials', 'true') # If using credentials
        return response, 200 # Important: Return 200 OK for OPTIONS

    claims = get_jwt()
    user_role = claims.get("role")
    if user_role != 'admin':
        return jsonify({"msg": "Administration rights required to view alerts."}), 403

    try:
        # Pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        if page < 1: page = 1
        if per_page < 1: per_page = 1
        if per_page > 100: per_page = 100 # Max limit
        skip = (page - 1) * per_page

        # Filtering parameters
        query = {}
        if request.args.get('session_id'):
            query['session_id'] = request.args.get('session_id')
        if request.args.get('student_id'): # Assuming student_id is stored directly
            query['student_id'] = request.args.get('student_id')
        if request.args.get('student_username'): # Filter by username if student_id not always present
            query['student_username'] = request.args.get('student_username')
        if request.args.get('alert_type'):
            query['alert_type'] = request.args.get('alert_type')
        if request.args.get('severity'):
            query['severity'] = request.args.get('severity')

        # Date filtering
        date_filters = {}
        if request.args.get('date_from'):
            try:
                date_filters["$gte"] = datetime.datetime.fromisoformat(request.args.get('date_from').replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"msg": "Invalid date_from format. Use ISO 8601."}), 400
        if request.args.get('date_to'):
            try:
                date_filters["$lte"] = datetime.datetime.fromisoformat(request.args.get('date_to').replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"msg": "Invalid date_to format. Use ISO 8601."}), 400
        if date_filters:
            query['timestamp'] = date_filters

        # Sorting parameters
        sort_by = request.args.get('sort_by', 'timestamp')
        # Basic validation for sort_by field to prevent NoSQL injection-like issues if sort_by is user-controlled and complex
        allowed_sort_fields = ['timestamp', 'alert_type', 'severity', 'student_username', 'session_id']
        if sort_by not in allowed_sort_fields:
            sort_by = 'timestamp' # Default to timestamp if invalid field provided
            
        order_str = request.args.get('order', 'desc').lower()
        sort_direction = DESCENDING if order_str == 'desc' else ASCENDING

        # Fetch alerts with filters, sorting, and pagination
        alerts_cursor = alerts_collection.find(query).sort(sort_by, sort_direction).skip(skip).limit(per_page)
        retrieved_alerts = list(alerts_cursor)

        # Get total count for pagination
        total_alerts = alerts_collection.count_documents(query)
        total_pages = math.ceil(total_alerts / per_page) if per_page > 0 else 0
        if total_pages == 0 and total_alerts > 0 : total_pages = 1 # if less items than per_page

        # Convert ObjectId and datetime for JSON serialization
        for alert in retrieved_alerts:
            if '_id' in alert:
                alert['_id'] = str(alert['_id'])
            if 'timestamp' in alert and isinstance(alert['timestamp'], datetime.datetime):
                alert['timestamp'] = alert['timestamp'].isoformat()
            # No need to convert last_alert_timestamp, it is already isoformat string from alert saving logic

        response_data = {
            "alerts": retrieved_alerts,
            "total_pages": total_pages,
            "current_page": page,
            "total_alerts": total_alerts,
            "per_page": per_page
        }
        return jsonify(response_data), 200
    except Exception as e:
        print(f"[ERROR] Could not retrieve alerts: {str(e)}", flush=True)
        return jsonify({"msg": "Failed to retrieve alerts", "error": str(e)}), 500

@app.route('/api/admin/snapshots/<path:filename>', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_admin_snapshot(filename):
    claims = get_jwt()
    user_role = claims.get("role")
    if user_role != 'admin':
        return jsonify({"msg": "Administration rights required to view snapshots."}), 403

    # Basic security check to prevent directory traversal or accessing unintended files
    if '..' in filename or filename.startswith('/') or not filename.endswith('.jpg'): # Basic check
        print(f"[SECURITY_WARNING] Invalid snapshot filename requested by admin {get_jwt_identity()}: {filename}", flush=True)
        return jsonify({"msg": "Invalid snapshot filename."}), 400
    
    print(f"[SNAPSHOT_ACCESS] Admin {get_jwt_identity()} requesting snapshot: {filename} from {SNAPSHOT_DIR}", flush=True)
    try:
        return send_from_directory(SNAPSHOT_DIR, filename, as_attachment=False, mimetype='image/jpeg')
    except FileNotFoundError:
        print(f"[SNAPSHOT_ERROR] Snapshot not found: {filename} in {SNAPSHOT_DIR}", flush=True)
        return jsonify({"msg": "Snapshot not found."}), 404
    except Exception as e:
        print(f"[SNAPSHOT_ERROR] Error serving snapshot {filename}: {str(e)}", flush=True)
        return jsonify({"msg": "Error serving snapshot."}), 500

def _build_cors_preflight_response():
    response = jsonify({'message': 'CORS preflight successful'})
    # These headers are often managed by Flask-Cors with @cross_origin, 
    # but explicitly setting them here for an OPTIONS handler can sometimes help.
    # However, with @cross_origin, this explicit handler might not even be strictly necessary
    # if Flask-Cors correctly handles the OPTIONS method added to @app.route.
    # For now, let's keep it simple and rely on @cross_origin to add the headers.
    # If issues persist, we can add them manually:
    response.headers.add("Access-Control-Allow-Origin", "*") # Adjust as needed
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response

# Example SocketIO event handlers (to be expanded in Task 3.4.2)
@socketio.on('connect', namespace='/ws/admin_dashboard')
def handle_admin_connect():
    auth_header = request.args.get('token') # Expect token in query param e.g., ?token=Bearer <JWT>
    auth_success = False
    user_identity = None

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            # Temporarily set up a Flask app context to use verify_jwt_in_request_optional or similar
            # This is a bit of a workaround because SocketIO handlers might not have the full Flask request context
            # that flask_jwt_extended expects for its decorators.
            with app.app_context():
                # We need a way to verify the token and get its claims without a full HTTP request context.
                # A more direct way would be to decode the token manually if flask_jwt_extended allows it easily.
                # For now, let's simulate a request context for verification if possible, or directly decode.
                
                # Create a dummy request context to verify JWT.
                # This might not be the cleanest way. Flask-SocketIO can integrate with Flask-Login more directly.
                # For Flask-JWT-Extended, it's often easier if the token is passed in a way that decorators can catch it,
                # or by manually decoding.
                
                # Alternative: Manually decode using PyJWT (underlying library for Flask-JWT-Extended)
                # from jose import jwt as jose_jwt, JWTError
                # try:
                #     decoded_token = jose_jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
                #     user_identity = decoded_token.get('sub')
                #     user_role = decoded_token.get('role')
                #     if user_role == 'admin':
                #         auth_success = True
                # except JWTError as e:
                #     print(f"[SocketIO Auth] JWT Error: {str(e)}", flush=True)

                # Simpler approach: Use a custom decorator or a helper if this becomes too complex.
                # For now, let's assume we can get claims if the token is valid.
                # This part needs to be robust. Let's use a simplified check for now and refine if needed.
                
                # One common way with Flask-JWT-Extended is to protect an HTTP endpoint 
                # that the WebSocket client calls first to get a short-lived ws-specific token, 
                # or to pass the main JWT and verify it manually or via a helper.

                # Let's assume a helper function or direct decoding for simplicity in this step.
                # This function would ideally use flask_jwt_extended's capabilities.
                # For the purpose of this step, we'll simulate a successful admin auth if token is present.
                # THIS IS A SIMPLIFIED AUTH FOR NOW AND NEEDS TO BE MADE ROBUST
                
                # A more robust way would be to try and decode the token directly
                # This is a conceptual sketch, actual implementation might vary based on flask_jwt_extended version and best practices
                from flask_jwt_extended.exceptions import JWTDecodeError
                from flask_jwt_extended.utils import decode_token

                try:
                    decoded_token = decode_token(token)
                    user_identity = decoded_token.get(app.config.get("JWT_IDENTITY_CLAIM", "sub"))
                    user_role = decoded_token.get('role') # Assuming 'role' is in the token
                    if user_role == 'admin':
                        auth_success = True
                        print(f"[SocketIO Auth] Admin user '{user_identity}' authenticated for WebSocket.", flush=True)
                    else:
                        print(f"[SocketIO Auth] User '{user_identity}' is not an admin. Role: '{user_role}'. Denying WebSocket.", flush=True)
                except JWTDecodeError as e:
                    print(f"[SocketIO Auth] JWT Decode Error: {str(e)}", flush=True)
                except Exception as e:
                    print(f"[SocketIO Auth] Error during token decoding: {str(e)}", flush=True)

        except Exception as e:
            print(f"[SocketIO Auth] General authentication error: {str(e)}", flush=True)
    else:
        print("[SocketIO Auth] WebSocket connection attempt without token or invalid format.", flush=True)

    if auth_success:
        print(f"[SocketIO] Admin client '{user_identity}' (SID: {request.sid}) connected to /ws/admin_dashboard", flush=True)
        join_room(admin_dashboard_room) 
        emit('connection_ack', {'message': 'Successfully authenticated and connected to admin dashboard namespace'}, sid=request.sid)
    else:
        print(f"[SocketIO Auth] WebSocket authentication failed for SID: {request.sid}. Disconnecting.", flush=True)
        # emit('auth_failed', {'message': 'Authentication failed'}, sid=request.sid) # Optionally send an error message
        disconnect() # Disconnect the client

@socketio.on('disconnect', namespace='/ws/admin_dashboard')
def handle_admin_disconnect():
    print(f"[SocketIO] Admin client disconnected from /ws/admin_dashboard: {request.sid}", flush=True)
    leave_room(admin_dashboard_room)

# --- Student Monitoring Session Management Endpoints (Task 3.2.2) ---

@app.route('/api/student/monitoring/start', methods=['POST', 'OPTIONS'])
@jwt_required()
def start_monitoring_session():
    if request.method == 'OPTIONS':
        print("[DEBUG_CORS] OPTIONS request explicitly handled for /api/student/monitoring/start.", flush=True)
        response = jsonify({'message': 'OPTIONS request successful for /api/student/monitoring/start'})
        return response, 200

    data = request.get_json()
    new_session_id = data.get('session_id') # Frontend suggests this session_id

    if not new_session_id:
        return jsonify({"msg": "session_id is required"}), 400

    current_user = get_jwt_identity() # This is the username
    
    # --- BEGIN MODIFICATION: Clean up existing sessions for the same user ---
    existing_session_ids_for_user = []
    for sid, sdata in list(active_sessions_store.items()): # Iterate over a copy for safe deletion
        if sdata.get("student_username") == current_user:
            existing_session_ids_for_user.append(sid)

    for old_sid in existing_session_ids_for_user:
        if old_sid == new_session_id: # Should not happen if frontend generates unique IDs, but good check
            continue 
        if old_sid in active_sessions_store: # Double check it still exists
            del active_sessions_store[old_sid]
            print(f"[Session Cleanup] Implicitly stopped and removed old session '{old_sid}' for user '{current_user}' before starting new session '{new_session_id}'.", flush=True)
            socketio.emit('student_session_ended', {"session_id": old_sid, "reason": "new_session_started"}, room=admin_dashboard_room, namespace='/ws/admin_dashboard')
            print(f"[SocketIO] Broadcast 'student_session_ended' (implicit due to new session) for old session {old_sid} to room {admin_dashboard_room}", flush=True)
    # --- END MODIFICATION ---


    session_data = {
        "student_id": current_user, 
        "student_username": current_user,
        "monitoring_start_time": datetime.datetime.utcnow().isoformat(),
        "last_heartbeat_time": datetime.datetime.utcnow().isoformat(),
        "latest_face_analysis_status": "Monitoring starting...",
        "latest_face_snapshot_filename": None,
        "latest_audio_event_summary": "Normal",
        "unread_alert_count": 0,
        "last_alert_timestamp": None
    }
    active_sessions_store[new_session_id] = session_data # Use the new_session_id provided by frontend
    print(f"[Session] Student '{current_user}' started monitoring session: {new_session_id}", flush=True)
    
    admin_payload = {
        "session_id": new_session_id,
        "student_id": session_data["student_id"],
        "student_name": session_data["student_username"],
        "monitoring_start_time": session_data["monitoring_start_time"],
        "last_snapshot_url": None, # Initially no snapshot
        "latest_status": session_data["latest_face_analysis_status"],
        "unread_alert_count": session_data["unread_alert_count"],
        "last_alert_timestamp": session_data["last_alert_timestamp"]
    }
    socketio.emit('new_student_session_started', admin_payload, room=admin_dashboard_room, namespace='/ws/admin_dashboard')
    print(f"[SocketIO] Broadcast 'new_student_session_started' for session {new_session_id} to room {admin_dashboard_room}", flush=True)

    return jsonify({"msg": "Monitoring session started", "session_id": new_session_id}), 200

@app.route('/api/student/monitoring/heartbeat', methods=['POST', 'OPTIONS'])
@jwt_required()
def monitoring_session_heartbeat():
    data = request.get_json()
    session_id = data.get('session_id')

    if not session_id:
        return jsonify({"msg": "session_id is required"}), 400

    if session_id in active_sessions_store:
        active_sessions_store[session_id]["last_heartbeat_time"] = datetime.datetime.utcnow().isoformat()
        # print(f"[Session] Heartbeat for session: {session_id}", flush=True) # Can be too verbose
        return jsonify({"msg": "Heartbeat received"}), 200
    else:
        # This might happen if server restarted or session timed out/stopped
        print(f"[Session] Heartbeat for unknown/expired session: {session_id}", flush=True)
        return jsonify({"msg": "Session not found or expired. Please start a new session."}), 404

@app.route('/api/student/monitoring/stop', methods=['POST', 'OPTIONS'])
@jwt_required()
def stop_monitoring_session():
    data = request.get_json()
    session_id = data.get('session_id')
    current_user = get_jwt_identity()

    if not session_id:
        return jsonify({"msg": "session_id is required"}), 400

    if session_id in active_sessions_store:
        # Ensure the user stopping the session is the one who owns it (or an admin, if that logic is added)
        if active_sessions_store[session_id]["student_username"] == current_user:
            del active_sessions_store[session_id]
            print(f"[Session] Student '{current_user}' stopped monitoring session: {session_id}", flush=True)
            
            # Broadcast to admin dashboard (Task 3.4.3)
            socketio.emit('student_session_ended', {"session_id": session_id}, room=admin_dashboard_room, namespace='/ws/admin_dashboard')
            print(f"[SocketIO] Broadcast 'student_session_ended' for session {session_id} to room {admin_dashboard_room}", flush=True)
            
            return jsonify({"msg": "Monitoring session stopped"}), 200
        else:
            print(f"[Session Auth] User '{current_user}' attempted to stop session '{session_id}' owned by '{active_sessions_store[session_id]['student_username']}'. Denied.", flush=True)
            return jsonify({"msg": "Unauthorized to stop this session"}), 403
    else:
        print(f"[Session] Stop request for unknown/expired session: {session_id}", flush=True)
        return jsonify({"msg": "Session not found or already stopped"}), 404

# --- Admin Dashboard API Endpoints (Task 3.1 / 3.2.4) ---
@app.route('/api/admin/dashboard/active_sessions', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_active_dashboard_sessions():
    # Explicitly handle OPTIONS requests first
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OPTIONS request successful for /api/admin/dashboard/active_sessions'})
        # Flask-CORS should handle adding necessary headers based on global config
        return response, 200

    claims = get_jwt()
    user_role = claims.get("role")

    if user_role != 'admin':
        return jsonify({"msg": "Administration rights required"}), 403

    # Basic pagination and sorting (can be expanded later)
    # page = request.args.get('page', 1, type=int)
    # per_page = request.args.get('per_page', 10, type=int)
    # sort_by = request.args.get('sort_by', 'monitoring_start_time')
    # order = request.args.get('order', 'desc')

    sessions_list = []
    for session_id, session_data in active_sessions_store.items():
        # Construct snapshot URL if filename exists
        snapshot_url = None
        if session_data.get("latest_face_snapshot_filename"):
            # This assumes snapshots are served from a specific endpoint or static dir
            # For now, let's imagine a future endpoint like /api/media/snapshots/<filename>
            # Or if storing relative to a known media path accessible by frontend through nginx proxy
            snapshot_url = f"/api/media/snapshots/{session_data['latest_face_snapshot_filename']}" 
            # Placeholder - actual URL construction will depend on how snapshots are stored and served

        sessions_list.append({
            "session_id": session_id,
            "student_id": session_data.get("student_id", "Unknown Student"), # Safely access student_id
            "student_name": session_data["student_username"],
            # "exam_id": session_data.get("exam_id"), # if used
            "monitoring_start_time": session_data["monitoring_start_time"],
            "last_snapshot_url": snapshot_url, 
            "latest_status": session_data["latest_face_analysis_status"], # This will be updated by analyze-face
            "latest_audio_event": session_data["latest_audio_event_summary"], # This will be updated by analyze-audio
            "unread_alert_count": session_data["unread_alert_count"],
            "last_alert_timestamp": session_data["last_alert_timestamp"],
            "last_heartbeat_time": session_data["last_heartbeat_time"]
        })
    
    # Implement sorting and pagination here if query params are used
    # For now, returning all active sessions
    print(f"[Admin Dashboard] Admin '{get_jwt_identity()}' fetched {len(sessions_list)} active sessions.", flush=True)
    return jsonify(sessions_list), 200

# Note: The if __name__ == '__main__': block is typically for direct execution (python app.py)
# When using Gunicorn (as planned for Docker), Gunicorn itself will run the Flask app object.
# So, this block won't be executed by Gunicorn, but it's fine to keep for local dev/testing.
if __name__ == '__main__':
    # For local testing, you might need to ensure model files are found.
    # The paths in face_detector.py, face_landmarks.py might need adjustment for local run vs Docker.
    print("[INFO] Starting Flask app with SocketIO and Eventlet...")
    # app.run(host='0.0.0.0', port=5000, debug=True) # Old way
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True if os.environ.get("FLASK_ENV") == "development" else False) 