# Base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and TensorFlow
# Note: Specific versions of these libraries might be needed depending on your OS/architecture within the container
# For example, some OpenCV functions might need libgtk2.0-dev or similar GUI libraries if image display is attempted within container (not typical for server app)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    # Add other dependencies as identified during build or runtime if necessary
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
# Ensure all dependencies in requirements.txt are compatible with the Python version and each other
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly install Flask-JWT-Extended to ensure it's available
RUN pip install --no-cache-dir Flask-JWT-Extended

# Explicitly install audio libraries to ensure they are available
RUN pip install --no-cache-dir librosa
RUN pip install --no-cache-dir webrtcvad-wheels

# Explicitly copy the mp3 file, then copy the rest
# COPY file.mp3 /app/file.mp3 # Removed this line as file.mp3 was a test file and has been deleted
COPY . .

# Ensure model files used by face_detector.py, face_landmarks.py are copied
# The Proctoring-AI repo might contain model files (.pb, .pbtxt, .dat) that these scripts load.
# These model files MUST be present in this build context (./backend) to be copied by `COPY . .`
# And the paths within the Python scripts must correctly reference them (e.g. relative to /app).
# Example: If models are in a `models` subdirectory: COPY models ./models

# Expose port that Gunicorn will run on
EXPOSE 5000

# Define command to run the application using Gunicorn
# Ensure app:app correctly points to your Flask app instance in app.py
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5000", "app:app"] 