# Scratchpad

## Current Task Focus

**Overall Goal:** Implement Advanced Proctoring Features (Sound Detection, Screen Monitoring, Admin Dashboard, Nested Users) and stabilize the frontend build.

**Current Phase:** Feature Enhancements & Bug Fixing (Batch 1).

**Active Implementation Plans:**
1.  `docs/implementation-plan/feature-enhancements-batch-1.md` (Newly Created)
2.  `docs/implementation-plan/frontend-build-resolution.md` (Completed - Frontend is rendering)
3.  `docs/implementation-plan/admin-multi-student-dashboard.md` (Planning Phase - some items may be superseded by batch-1)
4.  `docs/implementation-plan/sound-detection.md` (Recent UI refinements completed. Paused for now.)
5.  `docs/implementation-plan/screen-monitoring.md` (Not started)
6.  `docs/implementation-plan/nested-user-hierarchy.md` (To be created after admin dashboard)

**Completed Tasks:**
*   User Authentication: `docs/implementation-plan/user-authentication.md` (Merged via PR #2)
*   Sound Detection - Audio Playback & Initial UI: (Considered complete for now, refinements for student view done)
*   Frontend Build Resolution: `docs/implementation-plan/frontend-build-resolution.md` (Frontend is now rendering)

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
*   **[2025-05-28] Webpack Polyfill Specificity (`process/browser`):** When providing polyfills for Node.js core modules like `process` in Webpack 5 (via `react-app-rewired` and `config-overrides.js`), some packages (e.g., `axios`) might attempt to import highly specific paths like `process/browser`. A simple fallback for `"process": require.resolve("process/browser")` might not be enough. The error "BREAKING CHANGE: The request 'process/browser' failed to resolve only because it was resolved as fully specified" is a strong indicator. Using `resolve.alias` to explicitly map `'process/browser': require.resolve('process/browser.js')` can be a more robust solution.
*   **[2025-05-28] `npm audit fix --force`:** When `npm audit` suggests `--force` due to SemVer major changes (e.g., `react-scripts`), it's often necessary to apply it to resolve underlying vulnerabilities, especially if the build is already unstable. Be prepared for potential breaking changes and test thoroughly.
*   **[2025-05-28] Frontend Port Conflicts:** Always specify a distinct port (e.g., `npm start -- --port 3001`) if the default port (often 3000) is in use or if multiple frontend projects are running. Check terminal output to confirm the actual port used by the dev server.
*   **[2025-05-28] `sudo` for `rm -rf node_modules`:** If `rm -rf node_modules` fails due to permission errors, `sudo rm -rf node_modules` may be required. However, `npm install` and other `npm` commands should generally *not* be run with `sudo`.

## Notes & Reminders

*   The Admin Multi-Student Dashboard will require significant backend API changes and a new frontend view.
*   Consider using WebSockets for real-time updates on the dashboard.

## Current Task
- **Task:** [FEATURE ENHANCEMENTS BATCH 1] Task 1.1 Completed. Executor ready for Task 1.2.
- **Status:** Task 1.1 (Branching) is complete. The current branch is `feature/feature-enhancements-batch-1`.
- **Implementation Plan:** [`docs/implementation-plan/feature-enhancements-batch-1.md`](docs/implementation-plan/feature-enhancements-batch-1.md)

## Detailed Steps (from Implementation Plan)
**Current focus: Task 1.2 & 1.3 (Admin Dashboard - Active Sessions)**
*   Task 1.2 (UI): Verify `AdminDashboard.js` correctly displays sessions based on backend data. No immediate code changes identified for client-side filtering; relies on backend for accuracy. Verification pending Task 1.3.
*   Task 1.3 (API): Reviewed `get_active_dashboard_sessions`. The route itself is likely correct. The core issue, if stale sessions appear, would be in the `active_sessions_store` management (via start/stop student session routes and their WebSocket events). Verification of the full session lifecycle is needed.
*   Task 1.4 (UI): Clickable session boxes implemented. Navigates to placeholder `/admin/session/:sessionId`.
*   Task 1.5 (UI): Basic layout for Student Detail Page completed (placeholder `StudentSessionDetail.js` created in Task 1.4 fulfills this).
*   Next focus: Task 2.1 (Alert Log UI - Initial Cleanup Review).

## Previous Task (Sound Detection UI Refinements)
- **Task:** [SOUND DETECTION] UI Refinements for Student View (Button colors, labels, font sizes).
- **Status:** Completed. Changes committed to `feature/sound-detection`.
- **Implementation Plan:** [`docs/implementation-plan/sound-detection.md`](docs/implementation-plan/sound-detection.md)

---
*(Older entries from sound-detection.md may be archived or summarized if this section becomes too long)*

## Lessons Learned (New - Add items here as they occur)
- [2025-05-28] When facing persistent, complex build issues after multiple attempts, switching from an iterative Executor mode to a more structured Planner mode is beneficial to re-evaluate and form a systematic plan.
- [2025-05-30] If a backend route returns a 500 error without clear tracebacks in the default logs, add comprehensive `try-except` blocks with detailed exception and `traceback.format_exc()` logging directly within the problematic route handler to pinpoint the source of the error.
- [2025-05-30] Backend logs showing "No <expected_field> in request payload" alongside frontend logs confirming data generation usually points to a key name mismatch between the frontend payload and backend expectation. Double-check exact key names.
- [2025-05-30] The `ERR_OSSL_EVP_UNSUPPORTED` error during `npm start` on Node.js v17+ with older `react-scripts` (like v3 or v4) can often be resolved by setting the `NODE_OPTIONS=--openssl-legacy-provider` environment variable before the `npm start` command. This was necessary after `npm audit fix --force` downgraded `react-scripts`.
- [2025-05-30] A blank white screen after `npm start` successfully compiles often indicates severe JavaScript runtime errors, frequently due to module incompatibilities (e.g. after a major dependency downgrade like `react-scripts`). Check browser console for errors.
*   [2025-05-30] Modern JavaScript syntax (e.g., `??`, `?.`) in `node_modules` packages (like `@mui/base`) might not be transpiled by default by `react-scripts`' Babel configuration, leading to "Module parse failed: Unexpected token" errors. `config-overrides.js` can be used to adjust Babel loader rules to include these packages for transpilation.
*   [2025-05-30] The `Uncaught ReferenceError: process is not defined` in the browser indicates missing webpack polyfills for Node.js core modules. These need to be configured in `config-overrides.js` (e.g., using `resolve.fallback` and `webpack.ProvidePlugin`).