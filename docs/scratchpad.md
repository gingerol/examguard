# Scratchpad

## Current Task
- **Task:** [NEW] Proctoring Enhancements (Eye-Tracking Sensitivity, MongoDB Logging)
- **Implementation Plan:** [`docs/implementation-plan/proctoring-enhancements.md`](docs/implementation-plan/proctoring-enhancements.md)

## Detailed Steps (from Implementation Plan)

1.  **Task 1: Initialize Git and Create Feature Branch**
    *   Action: If not already a git repo, run `git init`. Create and checkout a new branch: `git checkout -b feature/setup-environment-docker`.
    *   Success Criteria: Git repository initialized (if needed) and on the new `feature/setup-environment-docker` branch.

2.  **Task 2: Server Preparation for Docker**
    *   Sub-Task 2.1: Update system packages.
        *   Action: `sudo apt update && sudo apt upgrade -y`
        *   Success Criteria: System packages updated.
    *   Sub-Task 2.2: Install Docker Engine.
        *   Action: Follow official Docker installation script: `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && rm get-docker.sh`
        *   Success Criteria: Docker Engine installed. `docker --version` shows version.
    *   Sub-Task 2.3: Install Docker Compose (v2).
        *   Action: `sudo apt install -y docker-compose-plugin` (or follow latest official instructions for installing the plugin if this fails).
        *   Success Criteria: Docker Compose plugin installed. `docker compose version` shows version.
    *   Sub-Task 2.4: Add current user to the `docker` group.
        *   Action: `sudo usermod -aG docker $USER`
        *   Success Criteria: User added to docker group. (Note: User needs to log out and back in, or start a new shell session for this to take effect. For automation, subsequent docker commands might still need `sudo` or `newgrp docker` in the script if a new session isn't started).

3.  **Task 3: Prepare Application Directory Structure and Initial Files**
    *   Sub-Task 3.1: Create root project directory.
        *   Action: `mkdir -p /opt/ai-proctor-docker && cd /opt/ai-proctor-docker`
        *   Success Criteria: Directory `/opt/ai-proctor-docker` created and is current working directory.
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
    *   Sub-Task 3.5: Clone `Proctoring-AI` for helper modules if needed.
        *   Action: `git clone https://github.com/vardanagarwal/Proctoring-AI.git temp-proctoring-ai && cp temp-proctoring-ai/face_detector.py temp-proctoring-ai/face_landmarks.py temp-proctoring-ai/eye_tracker.py backend/ && rm -rf temp-proctoring-ai`
        *   (Alternative: If these files are simple, they could be created directly from the guide's context if fully specified there).
        *   Success Criteria: `face_detector.py`, `face_landmarks.py`, `eye_tracker.py` are in the `backend` directory.
    *   Sub-Task 3.6: Create basic `frontend/package.json`.
        *   Action: Create `frontend/package.json` with content specified in implementation plan.
        *   Success Criteria: `frontend/package.json` created.
    *   Sub-Task 3.7: Create `frontend/public/index.html`.
        *   Action: Create `frontend/public/index.html` with content specified in implementation plan.
        *   Success Criteria: `frontend/public/index.html` created.
    *   Sub-Task 3.8: Create `frontend/src/index.js`.
        *   Action: Create `frontend/src/index.js` with content specified in implementation plan.
        *   Success Criteria: `frontend/src/index.js` created.
    *   Sub-Task 3.9: Populate `frontend/src/App.js` (from `ubuntu_installation_guide.md`).
        *   Action: Create `frontend/src/App.js` with the React component code provided in the guide. (Ensure helper function `base64ToBlob` is included or defined).
        *   Success Criteria: `frontend/src/App.js` created.
    *   Sub-Task 3.10: Create `frontend/nginx.conf` for serving the React app.
        *   Action: Create `frontend/nginx.conf` with content specified in implementation plan.
        *   Success Criteria: `frontend/nginx.conf` created.

4.  **Task 4: Create `backend/Dockerfile`**
    *   Action: Create `backend/Dockerfile` with content specified in implementation plan.
    *   Success Criteria: `backend/Dockerfile` created.

5.  **Task 5: Create `frontend/Dockerfile` (Multi-stage)**
    *   Action: Create `frontend/Dockerfile` with content specified in implementation plan.
    *   Success Criteria: `frontend/Dockerfile` created.

6.  **Task 6: Create `docker-compose.yml`**
    *   Action: Create `docker-compose.yml` in `/opt/ai-proctor-docker` with content specified in implementation plan.
    *   Success Criteria: `docker-compose.yml` created. (Note: `app.py` will need to be updated to use `mongodb://mongodb:27017/` for the MongoDB connection URI if it's not already designed for that).

7.  **Task 7: Build and Run Application with Docker Compose**
    *   Sub-Task 7.1: Build Docker images.
        *   Action: `cd /opt/ai-proctor-docker && docker compose build`
        *   Success Criteria: Docker images for backend and frontend built successfully.
    *   Sub-Task 7.2: Start services in detached mode.
        *   Action: `docker compose up -d`
        *   Success Criteria: All containers (mongodb, backend, frontend) are running. `docker ps` confirms.

8.  **Task 8: Final Verification**
    *   Sub-Task 8.1: Check container logs for errors.
        *   Action: `docker compose logs mongodb`, `docker compose logs backend`, `docker compose logs frontend`
        *   Success Criteria: Logs show services started without critical errors.
    *   Sub-Task 8.2: Verify backend service.
        *   Action: `curl http://localhost:5000/api/health`
        *   Success Criteria: Receives a success JSON response (e.g., `{"status": "ok", ...}`).
    *   Sub-Task 8.3: Verify frontend service.
        *   Action: `curl http://localhost:3000` and open `http://localhost:3000` in a browser.
        *   Success Criteria: `curl` returns HTML content. Browser shows the React application.
    *   Sub-Task 8.4: User Validation (Manual E2E Test).
        *   Action: User to perform a basic end-to-end test of the proctoring system via the browser.
        *   Success Criteria (for user): Basic proctoring functionality is working as expected.

## Lessons Learned
- [YYYY-MM-DD] Initial lesson entry.
- [2024-07-24] Pivoted from direct OS installation to a Docker-based containerized approach. This required a full rewrite of the setup plan. Branch name changed to `feature/setup-environment-docker`.
- [2024-07-24] Critical Error: Planned Linux-specific commands (`apt`) for a macOS (`darwin`) environment. Package management and Docker installation steps must be OS-appropriate. For macOS, Docker Desktop is the standard and includes Docker Compose. `sudo apt update/upgrade` and `usermod` are incorrect for macOS Docker setup.
- [2024-07-24] Potential Blocker: The backend's Python helper scripts (`face_detector.py`, etc.) likely require pre-trained model files. These were not explicitly copied from the cloned `Proctoring-AI` repo into the `backend/` build context. The backend Docker image build might succeed, but the application will fail at runtime if models are missing. The `Dockerfile` has a `COPY . .` command; model files need to be in the `backend` directory for this to work, and Python scripts need to reference them correctly.

Status: New plan created. Ready to begin execution.

Next Steps: Proceed with Task 0: Setup Development Branch from the new plan.

*   **[2025-05-24]** Initial OS-specific commands (`apt update`) are not portable. Always verify target OS or use containerization for broader compatibility.
*   **[2025-05-24]** AI/ML helper scripts often have dependencies on specific model files. Ensure these are included in the deployment package/Docker image (`Proctoring-AI/models` directory).
*   **[2025-05-24]** Docker credential helper issues (`docker-credential-desktop not found`) can block Docker builds on macOS. Symlinking the executable (`/Applications/Docker.app/Contents/Resources/bin/docker-credential-desktop` to `/usr/local/bin/`) and restarting Docker Desktop resolves this.
*   **[2025-05-24]** Default Nginx port (`80` inside container) mapped to host port `3000` can conflict if `3000` is in use. Changed to `3001:80`.
*   **[2025-05-24]** OpenCV GUI calls (e.g., `cv2.namedWindow`, `cv2.imshow`, `cv2.createTrackbar`) in backend scripts will cause crashes (Qt/XCB errors, SIGABRT) in headless Docker environments. These must be removed or conditionally excluded.
*   **[2025-05-24]** When sourcing scripts from external repositories, verify function signatures and availability. `get_eye_status` was missing from the `Proctoring-AI` `eye_tracker.py` and had to be implemented based on its `track_eye` logic, and `app.py` updated to call it correctly.
*   **[2025-05-24]** Ensure `numpy` is available and imported if numpy array operations are used (e.g. `np.frombuffer`, `np.uint8`, `np.int32`, `np.linalg.norm`). The `eye_tracker.py` from the original `Proctoring-AI` repo had `cv2.resize` which needs `img` to be `np.array` or scalar. The `get_eye_status` we implemented might also need `np` for its calculations. 