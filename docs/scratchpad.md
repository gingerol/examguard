# Scratchpad

## Current Task Focus

**Overall Goal:** Implement Advanced Proctoring Features (Sound Detection and Screen Monitoring).

**Current Phase:** **DEBUGGING LOGIN REGRESSION**

**Active Implementation Plans:**
1.  `docs/implementation-plan/sound-detection.md` (Sound detection work is currently PAUSED, see Section 9 of this file for login debugging plan)
2.  `docs/implementation-plan/screen-monitoring.md` (Not started)

**Completed Tasks:**
*   User Authentication: `docs/implementation-plan/user-authentication.md` (Merged via PR #2)

## Key Information & Links

*   GitHub Repository: [https://github.com/gingerol/examguard](https://github.com/gingerol/examguard)
*   User Authentication PR (Merged): [https://github.com/gingerol/examguard/pull/2](https://github.com/gingerol/examguard/pull/2)

## Lessons Learned (Chronological)

*   **[2025-05-25] Docker Module Not Found:** If a Python package specified in `requirements.txt` consistently fails to import in a Docker container (`ModuleNotFoundError`) despite clean rebuilds (`--no-cache`, `down --rmi all -v`) and no errors during the `pip install -r requirements.txt` step in the Docker build log, try adding a separate, explicit `RUN pip install --no-cache-dir <package_name>` for that specific package in the Dockerfile. This can sometimes force the installation or provide more specific error messages. (Related to `Flask-JWT-Extended` issue during User Authentication task).
*   **[2025-05-26] MongoDB Stability & Disk Space:** MongoDB can fail with `pymongo.errors.ServerSelectionTimeoutError` (often presenting as `Name or service not known` from the PyMongo client) if the `mongod` process within its Docker container is crashing or unhealthy. A critical reason for such crashes can be the Docker host running out of disk space. This leads to "No space left on device" errors within the MongoDB container's logs when it attempts to write to its journal or data files, causing WiredTiger to panic and the `mongod` process to abort. Regularly pruning unused Docker images (e.g., `docker image prune -a -f`) and, more importantly, Docker build cache (e.g., `docker builder prune -af`) is crucial to prevent this, as build cache can consume a very large amount of space. After clearing space, a full restart of Docker Compose services (`docker-compose down && docker-compose up -d --build`) is necessary.
*   **[2025-05-26] Verify User Existence for Login Issues:** If encountering "Bad username or password" (401) errors after ruling out other issues like DB connectivity, directly query the user collection in MongoDB (e.g., `docker exec <mongo_container_name> mongosh <db_name> --eval "db.users.find({username: 'testuser'}).pretty()"`) to confirm the user exists. Users not being registered is a common cause. Also, be mindful of Docker volume persistence (`docker-compose down -v` deletes named volumes, potentially causing data loss if not intended).
*   **[YYYY-MM-DD]**: Placeholder for future lessons.

## Notes & Reminders

*   For Sound Detection and Screen Monitoring, thorough research into browser APIs and user permission handling will be crucial.
*   Decide which advanced feature to plan in detail first: Sound Detection or Screen Monitoring.
*   **LOGIN REGRESSION: Currently blocked by login failure (CORS & 500 errors). This is the top priority.**

## Current Task
- **Task:** [DEBUGGING] Fix Login Regression (CORS & 500 Errors)
- **Implementation Plan:** [`docs/implementation-plan/sound-detection.md#9-debugging-login-regression-cors--500-errors`](docs/implementation-plan/sound-detection.md#9-debugging-login-regression-cors--500-errors)

## Detailed Steps (from Implementation Plan)
*(To be filled by Executor as tasks from the login debugging plan are completed)*
- Task 0: Pause Sound Detection Work - Complete
- Task 1: Investigate Login Regression - In Progress

## Lessons Learned
- [YYYY-MM-DD] Initial lesson entry.
- [2024-07-24] Pivoted from direct OS installation to a Docker-based containerized approach. This required a full rewrite of the setup plan. Branch name changed to `feature/setup-environment-docker`.
- [2024-07-24] Critical Error: Planned Linux-specific commands (`apt`) for a macOS (`darwin`) environment. Package management and Docker installation steps must be OS-appropriate. For macOS, Docker Desktop is the standard and includes Docker Compose. `sudo apt update/upgrade` and `usermod` are incorrect for macOS Docker setup.
- [2024-07-24] Potential Blocker: The backend's Python helper scripts (`face_detector.py`, etc.) likely require pre-trained model files. These were not explicitly copied from the cloned `Proctoring-AI` repo into the `backend/` build context. The backend Docker image build might succeed, but the application will fail at runtime if models are missing. The `Dockerfile` has a `COPY . .` command; model files need to be in the `backend` directory for this to work, and Python scripts need to reference them correctly.

Status: New plan created. Ready to begin execution.

Next Steps: Proceed with Task 4: Testing and Refinement from `docs/implementation-plan/user-authentication.md`.

*   **[2025-05-24]** Initial OS-specific commands (`apt update`) are not portable. Always verify target OS or use containerization for broader compatibility.
*   **[2025-05-24]** AI/ML helper scripts often have dependencies on specific model files. Ensure these are included in the deployment package/Docker image (`Proctoring-AI/models` directory).
*   **[2025-05-24]** Docker credential helper issues (`docker-credential-desktop not found`) can block Docker builds on macOS. Symlinking the executable (`/Applications/Docker.app/Contents/Resources/bin/docker-credential-desktop` to `/usr/local/bin/`) and restarting Docker Desktop resolves this.
*   **[2025-05-24]** Default Nginx port (`80` inside container) mapped to host port `3000` can conflict if `3000` is in use. Changed to `3001:80`.
*   **[2025-05-24]** OpenCV GUI calls (e.g., `cv2.namedWindow`, `cv2.imshow`, `cv2.createTrackbar`) in backend scripts will cause crashes (Qt/XCB errors, SIGABRT) in headless Docker environments. These must be removed or conditionally excluded.
*   **[2025-05-24]** When sourcing scripts from external repositories, verify function signatures and availability. `get_eye_status` was missing from the `Proctoring-AI` `eye_tracker.py` and had to be implemented based on its `track_eye` logic, and `app.py` updated to call it correctly.
*   **[2025-05-24]** Ensure `numpy` is available and imported if numpy array operations are used (e.g. `np.frombuffer`, `np.uint8`, `np.int32`, `np.linalg.norm`