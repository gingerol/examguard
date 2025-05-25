# Implementation Plan: Setup Environment (Containerized with Docker)

## Branch Name
`feature/setup-environment-docker` (Suggesting a new branch name due to major change)

## Background and Motivation
The goal is to set up the development and operational environment for the AI Proctoring tool on the local server using Docker containers. This approach will provide better isolation, portability, and consistency across different environments compared to direct OS installation. This plan supersedes previous OS-level installation plans. The `ubuntu_installation_guide.md` will be used as a reference for application code and specific software components needed within containers.

## Key Challenges and Analysis
- **Docker and Docker Compose Installation:** Ensuring Docker Engine and Docker Compose are correctly installed and configured on the server. For macOS, this means checking for Docker Desktop and that it's running.
- **Dockerfile Creation:**
    - Backend: Correctly specifying the Python base image, all necessary system dependencies for libraries like OpenCV and TensorFlow within the container, Python package dependencies, and the Gunicorn startup command.
    - Frontend: Implementing a multi-stage Dockerfile for the React application, including Node.js for building and Nginx for serving. Correctly configuring Nginx for a Single Page Application (SPA) is crucial.
- **Application Code Integration:**
    - Backend: Sourcing `app.py` and any helper modules (e.g., `eye_tracker.py`, `face_detector.py`, `face_landmarks.py`) correctly. The original guide implies `Proctoring-AI` repo for these modules. We'll need to ensure they are available in the backend's build context. For `app.py`, we'll use the version from `ubuntu_installation_guide.md`.
    - Frontend: Creating a minimal `package.json`, `public/index.html`, `src/index.js` to support the `App.js` from the guide.
- **Docker Compose Configuration:**
    - Defining services, networks, volumes, and dependencies correctly.
    - Ensuring inter-container communication (e.g., backend to MongoDB).
    - Managing persistent data for MongoDB using Docker volumes.
- **Repository Structure:** Organizing files and directories to work effectively with Docker build contexts.
- **Resource Allocation:** Docker containers share host resources; monitoring may be needed for performance.
- **Debugging:** Debugging issues within containers can be more complex than direct OS installations.

## High-level Task Breakdown

1.  **Task 1: Initialize Git and Create Feature Branch**
    *   Action: If not already a git repo, run `git init`. Create and checkout a new branch: `git checkout -b feature/setup-environment-docker`.
    *   Success Criteria: Git repository initialized (if needed) and on the new `feature/setup-environment-docker` branch.

2.  **Task 2: Server Preparation for Docker (macOS)**
    *   Sub-Task 2.1: Check if Docker and Docker Compose are installed and accessible.
        *   Action: `docker --version && docker compose version`
        *   Success Criteria: Both commands execute successfully, displaying version information for Docker Engine and Docker Compose.
    *   Sub-Task 2.2: If Docker is not installed, inform the user.
        *   Action (Conditional): If Sub-Task 2.1 fails, inform the user: "Docker command-line tools are not detected. This typically means Docker Desktop is not installed or not running. Please install Docker Desktop for macOS from https://www.docker.com/products/docker-desktop/ and ensure it is started. The automated setup cannot proceed without Docker."
        *   Success Criteria: Docker is confirmed to be installed and running (either by 2.1 succeeding or by user confirming after manual installation).
    *   (Original Sub-Task 2.4 regarding `usermod -aG docker $USER` is Linux-specific and not typically required for Docker Desktop on macOS as it manages permissions differently.)

3.  **Task 3: Prepare Application Directory Structure and Initial Files**
    *   Sub-Task 3.1: Create root project directory (in current workspace).
        *   Action: `mkdir -p ./ai-proctor-docker && cd ./ai-proctor-docker`
        *   Success Criteria: Directory `./ai-proctor-docker` created relative to the current workspace, and is the current working directory.
    *   Sub-Task 3.2: Create subdirectories for services and initial files.
        *   Action: `mkdir -p backend frontend frontend/src frontend/public`
        *   Success Criteria: `backend` and `frontend` directories with `frontend/src` and `frontend/public` created.
    *   Sub-Task 3.3: Populate `backend/requirements.txt`.
        *   Action: Create `backend/requirements.txt` with content:
            ```
            opencv-python
            tensorflow # Consider specific version if known, e.g., tensorflow==2.x
            Flask
            flask-cors
            gunicorn
            pymongo
            python-dotenv
            numpy # Often a dependency for CV/ML
            # Add dlib if face_landmarks.py from Proctoring-AI requires it.
            ```
        *   Success Criteria: `backend/requirements.txt` created with necessary packages.
    *   Sub-Task 3.4: Populate `backend/app.py` (from `ubuntu_installation_guide.md`).
        *   Action: Create `backend/app.py` with the Python code provided in the guide.
        *   Success Criteria: `backend/app.py` created.
    *   Sub-Task 3.5: Clone `Proctoring-AI` repo and copy helper Python modules AND AI model files.
        *   Action: `git clone https://github.com/vardanagarwal/Proctoring-AI.git temp-proctoring-ai && cp temp-proctoring-ai/face_detector.py temp-proctoring-ai/face_landmarks.py temp-proctoring-ai/eye_tracker.py backend/ && mkdir -p backend/models && cp -r temp-proctoring-ai/models/. backend/models/ && rm -rf temp-proctoring-ai` (Note the `.` after `temp-proctoring-ai/models/` in `cp` to copy contents).
        *   Success Criteria: `face_detector.py`, `face_landmarks.py`, `eye_tracker.py` are in the `backend` directory. The `backend/models` directory is created and populated with files from the `Proctoring-AI/models` directory.
    *   Sub-Task 3.6: Create basic `frontend/package.json`.
        *   Action: Create `frontend/package.json` with content:
            ```json
            {
              "name": "ai-proctor-frontend",
              "version": "0.1.0",
              "private": true,
              "dependencies": {
                "axios": "^1.0.0",
                "bootstrap": "^5.0.0",
                "react": "^18.0.0",
                "react-bootstrap": "^2.0.0",
                "react-dom": "^18.0.0",
                "react-scripts": "5.0.1",
                "react-webcam": "^7.0.0"
              },
              "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build",
                "test": "react-scripts test",
                "eject": "react-scripts eject"
              },
              "eslintConfig": {
                "extends": [
                  "react-app",
                  "react-app/jest"
                ]
              },
              "browserslist": {
                "production": [
                  ">0.2%",
                  "not dead",
                  "not op_mini all"
                ],
                "development": [
                  "last 1 chrome version",
                  "last 1 firefox version",
                  "last 1 safari version"
                ]
              }
            }
            ```
        *   Success Criteria: `frontend/package.json` created.
    *   Sub-Task 3.7: Create `frontend/public/index.html`.
        *   Action: Create `frontend/public/index.html` with content:
            ```html
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#000000" />
                <title>AI Proctoring</title>
              </head>
              <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="root"></div>
              </body>
            </html>
            ```
        *   Success Criteria: `frontend/public/index.html` created.
    *   Sub-Task 3.8: Create `frontend/src/index.js`.
        *   Action: Create `frontend/src/index.js` with content:
            ```javascript
            import React from 'react';
            import ReactDOM from 'react-dom/client';
            import App from './App';
            import 'bootstrap/dist/css/bootstrap.min.css';

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(
              <React.StrictMode>
                <App />
              </React.StrictMode>
            );
            ```
        *   Success Criteria: `frontend/src/index.js` created.
    *   Sub-Task 3.9: Populate `frontend/src/App.js` (from `ubuntu_installation_guide.md`).
        *   Action: Create `frontend/src/App.js` with the React component code provided in the guide. (Ensure helper function `base64ToBlob` is included or defined).
        *   Success Criteria: `frontend/src/App.js` created.
    *   Sub-Task 3.10: Create `frontend/nginx.conf` for serving the React app.
        *   Action: Create `frontend/nginx.conf` with content:
            ```nginx
            server {
              listen 80;
              server_name localhost;
              root /usr/share/nginx/html;
              index index.html index.htm;

              location / {
                try_files $uri $uri/ /index.html;
              }

              # Optional: Add specific caching rules for static assets
              location ~* \.(?:ico|css|js|gif|jpe?g|png)$ {
                expires 1y;
                add_header Cache-Control "public";
              }
            }
            ```
        *   Success Criteria: `frontend/nginx.conf` created.


4.  **Task 4: Create `backend/Dockerfile`**
    *   Action: Create `backend/Dockerfile` with content:
        ```dockerfile
        # Base image
        FROM python:3.10-slim

        # Set working directory
        WORKDIR /app

        # Install system dependencies for OpenCV and TensorFlow
        RUN apt-get update && apt-get install -y \
            libsm6 \
            libxext6 \
            libxrender-dev \
            libgl1-mesa-glx \
            # Add other dependencies like libgtk2.0-dev if specific CV functions need it
            && rm -rf /var/lib/apt/lists/*

        # Copy requirements first to leverage Docker cache
        COPY requirements.txt .
        RUN pip install --no-cache-dir -r requirements.txt

        # Copy application code
        COPY . .

        # Expose port and define command
        EXPOSE 5000
        CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5000", "app:app"]
        ```
    *   Success Criteria: `backend/Dockerfile` created.

5.  **Task 5: Create `frontend/Dockerfile` (Multi-stage)**
    *   Action: Create `frontend/Dockerfile` with content:
        ```dockerfile
        # Stage 1: Build the React app
        FROM node:18-alpine AS builder
        WORKDIR /app
        COPY package*.json ./
        RUN npm install
        COPY . .
        RUN npm run build

        # Stage 2: Serve with Nginx
        FROM nginx:alpine
        COPY --from=builder /app/build /usr/share/nginx/html
        COPY nginx.conf /etc/nginx/conf.d/default.conf
        EXPOSE 80
        CMD ["nginx", "-g", "daemon off;"]
        ```
    *   Success Criteria: `frontend/Dockerfile` created.

6.  **Task 6: Create `docker-compose.yml`**
    *   Action: Create `docker-compose.yml` in `./ai-proctor-docker` with content:
        ```yaml
        version: '3.8'

        services:
          mongodb:
            image: mongo:latest
            container_name: ai-proctor-mongodb
            ports:
              - "27017:27017" # Expose if direct access needed, otherwise internal only
            volumes:
              - mongodb_data:/data/db
            networks:
              - ai_proctor_net

          backend:
            build: ./backend
            container_name: ai-proctor-backend
            ports:
              - "5000:5000"
            depends_on:
              - mongodb
            environment:
              # Define any environment variables needed by app.py
              # E.g., MONGO_URI: mongodb://mongodb:27017/mydatabase
              # These would need to be used in app.py to connect to Mongo
            networks:
              - ai_proctor_net

          frontend:
            build: ./frontend
            container_name: ai-proctor-frontend
            ports:
              - "3000:80" # Map host port 3000 to Nginx container port 80
            depends_on:
              - backend
            networks:
              - ai_proctor_net

        networks:
          ai_proctor_net:
            driver: bridge

        volumes:
          mongodb_data:
            driver: local
        ```
    *   Success Criteria: `docker-compose.yml` created. (Note: `app.py` will need to be updated to use `mongodb://mongodb:27017/` for the MongoDB connection URI if it's not already designed for that).

7.  **Task 7: Build and Run Application with Docker Compose**
    *   Sub-Task 7.1: Build Docker images.
        *   Action: `cd ./ai-proctor-docker && docker compose build`
        *   Success Criteria: Docker images for backend and frontend built successfully.
    *   Sub-Task 7.2: Start services in detached mode.
        *   Action: `docker compose up -d` (Attempt 1 failed due to port 3000 conflict. Will modify `docker-compose.yml` to use port 3001 for frontend and retry.)
        *   Success Criteria: All containers (mongodb, backend, frontend) are running. `docker ps` confirms.

8.  **Task 8: Final Verification**
    *   Sub-Task 8.1: Check container logs for errors.
        *   Action: `docker compose logs mongodb`, `docker compose logs backend`, `docker compose logs frontend`
        *   Success Criteria: Logs show services started without critical errors. (Backend logs initially showed Qt/XCB errors due to OpenCV GUI calls in `eye_tracker.py`. Fixed by commenting out GUI calls and implementing a headless `get_eye_status` function.)
    *   Sub-Task 8.2: Verify backend service.
        *   Action: `curl http://localhost:5000/api/health`
        *   Success Criteria: Receives a success JSON response (e.g., `{"status": "ok", ...}`).
    *   Sub-Task 8.3: Verify frontend service.
        *   Action: `curl http://localhost:3001` and open `http://localhost:3001` in a browser.
        *   Success Criteria: `curl` returns HTML content. Browser shows the React application (displaying webcam).
    *   Sub-Task 8.4: User Validation (Manual E2E Test).
        *   Action: User to perform a basic end-to-end test by clicking "Start Monitoring" and observing if face analysis (eye status, looking away) is reported from the webcam feed.
        *   Success Criteria (for user): Basic proctoring functionality (webcam monitoring and status updates) is working as expected.

## Project Status Board
*(Reset for Dockerized plan)*
- [x] Task 1: Initialize Git and Create Feature Branch
- [x] Task 2: Server Preparation for Docker (macOS)
    - [x] Sub-Task 2.1: Check if Docker and Docker Compose are installed
    - [ ] Sub-Task 2.2: Inform user to install Docker Desktop if not present (Conditional) - Skipped as Docker is present.
- [x] Task 3: Prepare Application Directory Structure and Initial Files
    - [x] Sub-Task 3.1: Create root project directory (in current workspace)
    - [x] Sub-Task 3.2: Create subdirectories
    - [x] Sub-Task 3.3: Populate `backend/requirements.txt`
    - [x] Sub-Task 3.4: Populate `backend/app.py`
    - [x] Sub-Task 3.5: Clone/Copy backend helper modules AND AI model files (Revised)
    - [x] Sub-Task 3.6: Create `frontend/package.json`
    - [x] Sub-Task 3.7: Create `frontend/public/index.html`
    - [x] Sub-Task 3.8: Create `frontend/src/index.js`
    - [x] Sub-Task 3.9: Populate `frontend/src/App.js`
    - [x] Sub-Task 3.10: Create `frontend/nginx.conf`
- [x] Task 4: Create `backend/Dockerfile`
- [x] Task 5: Create `frontend/Dockerfile`
- [x] Task 6: Create `docker-compose.yml`
- [ ] Task 7: Build and Run Application
    - [x] Sub-Task 7.1: Build Docker images
    - [ ] Sub-Task 7.2: Start services (Retrying after port change)
- [ ] Task 8: Final Verification
    - [ ] Sub-Task 8.1: Check container logs for errors
    - [ ] Sub-Task 8.2: Verify backend service
    - [x] Sub-Task 8.3: Verify frontend service (curl successful, user confirms browser shows webcam)
    - [ ] Sub-Task 8.4: User Validation (Manual E2E Test - webcam monitoring)

## Executor's Feedback or Assistance Requests
- Task 1 (Initialize Git and Create Feature Branch `feature/setup-environment-docker`) is complete.
- Task 2 (Server Preparation for Docker - macOS) is complete. Docker and Docker Compose are already installed (Docker v28.1.1, Compose v2.35.1).
- Task 3 (Prepare Application Directory Structure and Initial Files) is being revisited to ensure AI Models are copied (Sub-Task 3.5 revised).
- Task 4 (`backend/Dockerfile` creation) was marked complete but will be re-evaluated after model files are correctly in place.
- Task 3 (Prepare Application Directory Structure and Initial Files, including AI models) is complete.
- Task 4 (Create `backend/Dockerfile`) is complete (Dockerfile created previously, build context now includes models).
- **CRITICAL CORRECTION:** Sub-Task 3.5 has been revised to include copying the AI model files from the `Proctoring-AI/models` directory into `ai-proctor-docker/backend/models/`. This is essential for the backend to function. The `face_detector.py` and `face_landmarks.py` scripts will need to load models from a relative path like `models/model_name.pb` (which will be `/app/models/...` inside the container).
- **CRITICAL CORRECTION FOLLOW-UP:** Sub-Task 3.5 was successfully executed to copy AI models into `ai-proctor-docker/backend/models/`. The `face_detector.py` and `face_landmarks.py` scripts (and `eye_tracker.py`) copied from `Proctoring-AI` should now be able to find their models if they use relative paths like `models/model_file_name`. This will be verified during the Docker build and run stages. The `backend/Dockerfile` already includes `COPY . .` which will copy the `backend/models` directory into the image at `/app/models` because the Dockerfile's WORKDIR is `/app` and COPY source `.` is `backend/`.
- Task 5 (Create `frontend/Dockerfile`) is complete.
- Task 6 (Create `docker-compose.yml`) is complete. Note: `app.py` does not yet use the `MONGO_URI` defined in `docker-compose.yml`; this is for future database integration.
- **NEW BLOCKER:** `docker compose build` failed with `error getting credentials - err: exec: "docker-credential-desktop": executable file not found in $PATH`. This points to an issue with Docker's credential helper configuration on your macOS system. Please try restarting Docker Desktop. If the issue persists, searching online for this specific error message with "Docker Desktop macOS" may provide solutions. Execution is paused.
- **PERSISTENT BLOCKER (Attempting Fix):** The Docker credential helper issue (`docker-credential-desktop not found in $PATH`) persists. Suggested the user run the following command in their macOS terminal to symlink the credential helper: `sudo mkdir -p /usr/local/bin && sudo ln -sf /Applications/Docker.app/Contents/Resources/bin/docker-credential-desktop /usr/local/bin/docker-credential-desktop`. After running this and restarting Docker Desktop, we will re-attempt the build. Execution remains paused.
- Sub-Task 7.1 (Build Docker images) Succeeded after user applied symlink fix for Docker credential helper.
- **NEW ISSUE (Port Conflict):** `docker compose up -d` failed because host port 3000 is already in use. Modifying `docker-compose.yml` to map frontend to host port 3001.
+ Sub-Task 7.1 (Build Docker images) Succeeded.
+ Sub-Task 7.2 (Start services) Succeeded after changing frontend port to 3001.
+ **NEW ISSUE (Backend Crash - OpenCV GUI):** `docker compose logs backend` revealed that Gunicorn workers were crashing due to OpenCV (`cv2`) attempting to initialize GUI elements (Qt/XCB errors) in the headless Docker environment. This was traced to `eye_tracker.py` containing global `cv2.namedWindow` and `cv2.createTrackbar` calls, and `app.py` calling a non-existent `get_eye_status` function.
+ **FIX APPLIED:**
+   1. Commented out `cv2.namedWindow` and `cv2.createTrackbar` in `ai-proctor-docker/backend/eye_tracker.py`.
+   2. Implemented the missing `get_eye_status(img, shape)` function in `ai-proctor-docker/backend/eye_tracker.py` by adapting logic from its `track_eye` function, ensuring it's headless.
+   3. Updated `ai-proctor-docker/backend/app.py` to call `get_eye_status(img, marks)` correctly.
+ Next steps: Rebuild backend image, restart services, and check logs again.
+ Backend logs now clean. Frontend logs clean.
+ Backend health check `curl http://localhost:5000/api/health` successful.
+ Frontend `curl http://localhost:3001` successful. User confirms browser shows webcam feed.
+ Waiting for user to test "Start Monitoring" functionality at `http://localhost:3001` and perform E2E validation of webcam analysis.
+ **E2E Validation Complete:** User confirmed that webcam monitoring starts, and status/event logs are updated (e.g., "Status: Monitoring: Attentive (forward)", "Event Log: ...Student may be looking away..."). This confirms basic E2E functionality.
+ **User Feedback on Sensitivity:** User noted that the eye tracking sensitivity might be low, requiring substantial movement to trigger "looking away" events. This is valuable feedback for future model tuning/improvement tasks.
+ All tasks for setting up the Dockerized environment are now complete.