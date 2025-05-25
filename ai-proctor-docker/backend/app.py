from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import numpy as np
from eye_tracker import get_eye_status # Assumes eye_tracker.py is in the same directory
from face_detector import get_face_detector, find_faces # Assumes face_detector.py is in the same directory
from face_landmarks import get_landmark_model, detect_marks # Assumes face_landmarks.py is in the same directory

app = Flask(__name__)
CORS(app)

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
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    faces = find_faces(img, face_model)
    
    if len(faces) == 0:
        return jsonify({"error": "No face detected"}), 400
    
    if len(faces) > 1:
        # For simplicity, taking the first detected face if multiple are present
        # The original guide implies handling multiple faces as a warning, which is good.
        # jsonify({"warning": "Multiple faces detected", "count": len(faces)}), 200
        # For now, let's proceed with the first face for analysis, but this can be refined.
        pass # Let it proceed with the first face for now.

    face = faces[0] # Process the first detected face
    marks = detect_marks(img, landmark_model, face)
    eye_status = get_eye_status(marks)
    
    # Constructing response based on the original guide's details
    response_data = {
        "face_detected": True,
        "eye_status": eye_status,
        "looking_away": eye_status != "forward" # Assuming "forward" is the desired state
    }
    if len(faces) > 1:
        response_data["warning_multiple_faces"] = f"Multiple faces ({len(faces)}) detected, analyzed first one."

    return jsonify(response_data)

# Note: The if __name__ == '__main__': block is typically for direct execution (python app.py)
# When using Gunicorn (as planned for Docker), Gunicorn itself will run the Flask app object.
# So, this block won't be executed by Gunicorn, but it's fine to keep for local dev/testing.
if __name__ == '__main__':
    # For local testing, you might need to ensure model files are found.
    # The paths in face_detector.py, face_landmarks.py might need adjustment for local run vs Docker.
    app.run(host='0.0.0.0', port=5000, debug=True) # debug=True for local dev 