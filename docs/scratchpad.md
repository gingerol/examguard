# Scratchpad

## Current Task Focus

**Overall Goal:** Enhance UI/UX for all users and improve Admin Log Handling.

**Current Phase:** UI/UX and Admin Log Enhancements - Planning Phase Complete, ready for Execution.

**Active Implementation Plans:**
1.  `docs/implementation-plan/ui-ux-admin-log-enhancements.md` (Newly created, ready for execution)
2.  `docs/implementation-plan/sound-detection.md` (Audio playback implemented and committed. Main goals for this plan are complete.)
3.  `docs/implementation-plan/screen-monitoring.md` (Not started)

**Completed Task Plans:**
*   User Authentication: `docs/implementation-plan/user-authentication.md` (Merged via PR #2)

## Key Information & Links

*   GitHub Repository: [https://github.com/gingerol/examguard](https://github.com/gingerol/examguard)
*   User Authentication PR (Merged): [https://github.com/gingerol/examguard/pull/2](https://github.com/gingerol/examguard/pull/2)

## Lessons Learned (Chronological)

*   **[2025-05-24] Docker Module Not Found:** If a Python package specified in `requirements.txt` consistently fails to import in a Docker container (`ModuleNotFoundError`) despite clean rebuilds (`--no-cache`, `down --rmi all -v`) and no errors during the `pip install -r requirements.txt` step in the Docker build log, try adding a separate, explicit `RUN pip install --no-cache-dir <package_name>` for that specific package in the Dockerfile. This can sometimes force the installation or provide more specific error messages. (Related to `Flask-JWT-Extended` issue during User Authentication task).
*   **[2025-05-24] AI Model Files:** AI/ML helper scripts often have dependencies on specific model files. Ensure these are included in the deployment package/Docker image (e.g., from `Proctoring-AI/models` directory).
*   **[2025-05-24] Docker Credential Helper (macOS):** Issues like `docker-credential-desktop not found` can block Docker builds on macOS. Symlinking the executable (e.g., `/Applications/Docker.app/Contents/Resources/bin/docker-credential-desktop` to `/usr/local/bin/`) and restarting Docker Desktop can resolve this.
*   **[2025-05-24] Docker Port Conflicts:** Default Nginx port (`80` inside container) mapped to host port `3000` can conflict if `3000` is in use. Changed to `3001:80`.
*   **[2025-05-24] OpenCV in Headless Docker:** OpenCV GUI calls (e.g., `cv2.namedWindow`, `cv2.imshow`) in backend scripts will cause crashes in headless Docker environments. These must be removed or conditionally excluded.
*   **[2025-05-24] External Script Signatures:** When sourcing scripts from external repositories, verify function signatures and availability. `get_eye_status` was implemented based on `track_eye` logic from the `Proctoring-AI` `eye_tracker.py`.
*   **[2025-05-24] NumPy Dependency:** Ensure `numpy` is available and imported if numpy array operations are used.
*   **[2025-05-25] Explicit Pip Installs in Dockerfile:** For critical packages, an explicit `RUN pip install <package>` in the Dockerfile can be more reliable than solely relying on `requirements.txt`.
*   **[2025-05-25] Docker COPY Paths:** When Docker `COPY` commands fail, verify the file's existence, name (case-sensitive), and path within the Docker build context.
*   **[2025-05-26] Librosa and FFmpeg:** `librosa.load()` may require `ffmpeg` for certain audio formats. Ensure `ffmpeg` is installed in the container.
*   **[2025-05-26] Audio Library Warnings (Malformed Files):** Warnings from audio libraries (e.g., `libmpg123`) can indicate malformed or empty audio files.
*   **[2025-05-26] MongoDB Stability & Disk Space:** MongoDB can crash (`pymongo.errors.ServerSelectionTimeoutError`, "No space left on device") if the Docker host runs out of disk space. Regularly prune Docker images and build cache.
*   **[2025-05-26] Verify User Existence for Login Issues:** For 401 "Bad username or password" errors, confirm user existence in the database, especially after data modifications or volume changes.
*   **[2025-05-26] MongoDB Collection Name Consistency:** Ensure collection names in queries match those in application code.
*   **[2025-05-26] Default User Role on Registration:** If the frontend registration UI does not specify a role, the backend may default all new users to a 'student' role. This can prevent access to admin-only features if an 'admin' user is registered via this UI. Manual DB update or a dedicated admin creation mechanism is needed.

## Notes & Reminders

*   For Sound Detection and Screen Monitoring, thorough research into browser APIs and user permission handling will be crucial.
*   Decide which advanced feature to plan in detail first: Sound Detection or Screen Monitoring.
*   **SOUND DETECTION - AUDIO PLAYBACK: Currently blocked by `NotSupportedError` when trying to play fetched WAV audio. Next step is to verify `Content-Type` response header via Network tab, then investigate frontend `encodeWAV` if header is correct.**

## Current Task
- **Task:** [SOUND DETECTION] Implement Audio Playback for Events in Event History (Sub-Task 4.2 of `sound-detection.md`)
- **Status:** BLOCKED - Browser's `<audio>` element fails with `NotSupportedError: Failed to load because no supported source was found.`
- **Implementation Plan:** [`docs/implementation-plan/sound-detection.md`](docs/implementation-plan/sound-detection.md)

## Detailed Steps (from Implementation Plan)
*(To be filled by Executor as tasks from the sound detection plan are completed)*
- Task 0-3: Completed
- Task 4.0-4.1: Completed
- Task 4.2: In Progress - BLOCKED

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