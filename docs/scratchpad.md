# Scratchpad

## Current Task Focus

**Overall Goal:** Implement Advanced Proctoring Features (Sound Detection, Screen Monitoring, Admin Dashboard, Nested Users).

**Current Phase:** Admin Multi-Student Dashboard - Planning and Initial Setup.

**Active Implementation Plans:**
1.  `docs/implementation-plan/admin-multi-student-dashboard.md` (NEW - Current Focus)
2.  `docs/implementation-plan/sound-detection.md` (Recent UI refinements completed. Paused for now.)
3.  `docs/implementation-plan/screen-monitoring.md` (Not started)
4.  `docs/implementation-plan/nested-user-hierarchy.md` (To be created after admin dashboard)

**Completed Tasks:**
*   User Authentication: `docs/implementation-plan/user-authentication.md` (Merged via PR #2)
*   Sound Detection - Audio Playback & Initial UI: (Considered complete for now, refinements for student view done)

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
*   **[2025-05-27] React Dev Server Proxy:** For API requests (e.g., `/api/...`) from a React app served by `react-scripts` (webpack dev server) to a separate backend server during development, a `"proxy"` key (e.g., `"proxy": "http://localhost:5000"`) must be added to the frontend's `package.json`. Otherwise, the dev server will attempt to handle these API routes itself, often resulting in `text/html` responses for API calls and incorrect headers (like `x-powered-by: Express`), leading to errors like `NotSupportedError` for media playback. Ensure the dev server is fully restarted after adding this setting.
*   **[2025-05-27] Port Conflicts with `npm start`:** If the port specified in `PORT=xxxx npm start` (or the default port, usually 3000) is in use, `react-scripts` will typically prompt to use the next available port. Always check the terminal output from `npm start` to confirm the actual port the development server is running on (e.g., `http://localhost:3004` instead of `http://localhost:3003`).

## Notes & Reminders

*   The Admin Multi-Student Dashboard will require significant backend API changes and a new frontend view.
*   Consider using WebSockets for real-time updates on the dashboard.

## Current Task
- **Task:** [ADMIN DASHBOARD] Initial planning and setup for Admin Multi-Student Dashboard.
- **Status:** Planning phase. New implementation plan created.
- **Implementation Plan:** [`docs/implementation-plan/admin-multi-student-dashboard.md`](docs/implementation-plan/admin-multi-student-dashboard.md)

## Detailed Steps (from Implementation Plan)
*(To be filled by Executor as tasks from the admin dashboard plan are actioned)*

## Previous Task (Sound Detection UI Refinements)
- **Task:** [SOUND DETECTION] UI Refinements for Student View (Button colors, labels, font sizes).
- **Status:** Completed. Changes committed to `feature/sound-detection`.
- **Implementation Plan:** [`docs/implementation-plan/sound-detection.md`](docs/implementation-plan/sound-detection.md)

---
*(Older entries from sound-detection.md may be archived or summarized if this section becomes too long)*

## Lessons Learned (New - Add items here as they occur)
- [YYYY-MM-DD] New lesson entry for this session.