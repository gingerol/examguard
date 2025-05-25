# Scratchpad

## Current Task
- **Task:** [NEW] Implement User Authentication
- **Implementation Plan:** [`docs/implementation-plan/user-authentication.md`](docs/implementation-plan/user-authentication.md)

## Detailed Steps (from Implementation Plan)
*(To be filled by Executor as tasks from `docs/implementation-plan/user-authentication.md` are completed)*
- Task 0: Setup Development Branch - Complete
- Task 1: Design Authentication Strategy and User Model - Complete
- Task 2: Backend Implementation (Authentication API) - Complete
- Task 3: Frontend Implementation (Login UI and Auth Handling)
    - Sub-Task 3.1: Create Login/Registration UI components - Complete

## Lessons Learned
- [YYYY-MM-DD] Initial lesson entry.
- [2024-07-24] Pivoted from direct OS installation to a Docker-based containerized approach. This required a full rewrite of the setup plan. Branch name changed to `feature/setup-environment-docker`.
- [2024-07-24] Critical Error: Planned Linux-specific commands (`apt`) for a macOS (`darwin`) environment. Package management and Docker installation steps must be OS-appropriate. For macOS, Docker Desktop is the standard and includes Docker Compose. `sudo apt update/upgrade` and `usermod` are incorrect for macOS Docker setup.
- [2024-07-24] Potential Blocker: The backend's Python helper scripts (`face_detector.py`, etc.) likely require pre-trained model files. These were not explicitly copied from the cloned `Proctoring-AI` repo into the `backend/` build context. The backend Docker image build might succeed, but the application will fail at runtime if models are missing. The `Dockerfile` has a `COPY . .` command; model files need to be in the `backend` directory for this to work, and Python scripts need to reference them correctly.

Status: New plan created. Ready to begin execution.

Next Steps: Proceed with Task 3: Frontend Implementation (Login UI and Auth Handling) from `docs/implementation-plan/user-authentication.md`.

*   **[2025-05-24]** Initial OS-specific commands (`apt update`) are not portable. Always verify target OS or use containerization for broader compatibility.
*   **[2025-05-24]** AI/ML helper scripts often have dependencies on specific model files. Ensure these are included in the deployment package/Docker image (`Proctoring-AI/models` directory).
*   **[2025-05-24]** Docker credential helper issues (`docker-credential-desktop not found`) can block Docker builds on macOS. Symlinking the executable (`/Applications/Docker.app/Contents/Resources/bin/docker-credential-desktop` to `/usr/local/bin/`) and restarting Docker Desktop resolves this.
*   **[2025-05-24]** Default Nginx port (`80` inside container) mapped to host port `3000` can conflict if `3000` is in use. Changed to `3001:80`.
*   **[2025-05-24]** OpenCV GUI calls (e.g., `cv2.namedWindow`, `cv2.imshow`, `cv2.createTrackbar`) in backend scripts will cause crashes (Qt/XCB errors, SIGABRT) in headless Docker environments. These must be removed or conditionally excluded.
*   **[2025-05-24]** When sourcing scripts from external repositories, verify function signatures and availability. `get_eye_status` was missing from the `Proctoring-AI` `eye_tracker.py` and had to be implemented based on its `track_eye` logic, and `app.py` updated to call it correctly.
*   **[2025-05-24]** Ensure `numpy` is available and imported if numpy array operations are used (e.g. `np.frombuffer`, `np.uint8`, `np.int32`, `np.linalg.norm`). The `eye_tracker.py` from the original `Proctoring-AI` repo had `cv2.resize` which needs `img` to be `np.array` or scalar. The `get_eye_status` we implemented might also need `np` for its calculations. 