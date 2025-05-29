# Implementation Plan: Sound Detection in Proctoring

## 1. Overview
This plan outlines the steps to integrate sound detection capabilities into the AI Proctoring system. The goal is to identify suspicious audio events during a proctored exam session.

## 2. Branch Name
`feature/sound-detection`

## 3. Background and Motivation
Visual proctoring (face and eye tracking) is in place. Adding sound detection will enhance the system's ability to flag potentially suspicious activities by analyzing audio from the student's environment. This can include detecting speech (if the exam is meant to be silent), unexpected loud noises, or other audio cues that might indicate academic dishonesty or an unideal testing environment. The initial focus will be on detecting sustained speech and significant unexpected noises.

## 4. Key Challenges and Analysis
*(Expanded by Planner)*

-   **Microphone Access & Permissions:**
    -   Challenge: Consistently obtaining microphone access across various browsers (Chrome, Firefox, Safari, Edge) and operating systems. Users must explicitly grant permission.
    -   Analysis: Utilize `navigator.mediaDevices.getUserMedia({ audio: true })`. Provide clear instructions and error handling for permission denial or lack of microphone.
-   **Audio Data Transmission:**
    -   Challenge: Efficiently sending audio data from frontend to backend without overwhelming network or server.
    -   Analysis:
        -   Use WebSockets for continuous streaming if near real-time analysis is critical and backend can handle it.
        -   Alternatively, send audio chunks (e.g., every 5-10 seconds) via HTTPS POST requests. This is simpler to integrate with Flask.
        -   Consider client-side Voice Activity Detection (VAD) to only send audio when sound is present, reducing bandwidth. Libraries like `vad.js` or WebRTC VAD can be explored.
-   **Backend Audio Processing:**
    -   Challenge: Choosing robust and performant Python libraries for audio analysis.
    -   Analysis:
        -   For Voice Activity Detection (VAD): `webrtcvad-wheels` (Python wrapper for WebRTC VAD) is good for identifying speech segments.
        -   For Noise Level/Loudness: `librosa` can calculate Root Mean Square (RMS) energy.
        -   For Speech-to-Text (Future Scope): `SpeechRecognition` library (interfaces with various engines like Google Web Speech API, Sphinx). This is more complex and might be deferred.
        -   Initial focus: VAD to detect speech, RMS for general loudness.
-   **Defining "Suspicious" Sound Events:**
    -   Challenge: Establishing clear, objective criteria for what constitutes a reportable sound event to minimize false positives (e.g., coughs, sneezes, brief utterances vs. conversations).
    -   Analysis:
        -   Speech: Sustained speech for X seconds (e.g., > 3-5 seconds). Requires VAD that can segment speech.
        -   Loud Noise: Sound exceeding a certain RMS energy threshold for Y duration, different from typical ambient noise. Requires baseline noise profiling or adaptive thresholds.
        -   False positives: Environmental noises, pets, brief self-talk. Threshold tuning will be key.
-   **Resource Consumption:**
    -   Challenge: Client-side audio capture and potential pre-processing can consume CPU. Backend audio analysis is also CPU-intensive.
    -   Analysis: Optimize client-side processing. Ensure backend processing is efficient, possibly offloaded to a task queue if analysis is lengthy. Monitor performance during testing.
-   **Integration & Event Logging:**
    -   Challenge: Seamlessly integrating new sound event types into the existing MongoDB event schema and admin display.
    -   Analysis: Define clear `event_type` (e.g., `speech_detected`, `loud_noise_detected`) and `details` structure (e.g., `duration_seconds`, `confidence_vad`, `max_rms_level`).

## 5.1. Sound Event Definitions and Parameters
*(Added by Executor as part of Sub-Task 1.3)*

This section details the specific sound events the system will aim to detect and the parameters governing their detection.

### 1. `speech_detected` Event

-   **Description:** Triggered when sustained voice activity is detected.
-   **Detection Library:** `webrtcvad`
-   **Key Parameters:**
    -   `min_speech_duration_seconds`: The minimum duration of continuous speech required to trigger an event. 
        -   *Initial Value:* `3.0` seconds.
    -   `vad_aggressiveness_mode`: Controls the sensitivity of the Voice Activity Detection. An integer between 0 (least aggressive, most sensitive to non-speech) and 3 (most aggressive, might clip speech but better at filtering noise).
        -   *Initial Value:* `1`.
    -   `vad_frame_duration_ms`: The duration of individual audio frames processed by VAD. Supported values are 10, 20, or 30 ms.
        -   *Initial Value:* `30` ms.
-   **Logged Event Details:**
    -   `event_type`: "speech_detected"
    -   `username`: (from JWT)
    -   `session_id`: (from client)
    -   `timestamp`: (server-side)
    -   `details`: 
        -   `detected_speech_duration_seconds`: The actual duration of the continuous speech segment that triggered the event.
        -   `vad_aggressiveness_mode_used`: The VAD aggressiveness setting used for this detection.

### 2. `loud_noise_detected` Event

-   **Description:** Triggered when the audio level (RMS energy) exceeds a defined threshold for a minimum duration.
-   **Detection Library:** `librosa` (for RMS calculation)
-   **Key Parameters:**
    -   `rms_threshold_dbfs`: The loudness threshold in decibels relative to full scale (dBFS). Audio segments with RMS energy above this value are considered loud. For floating-point audio data (amplitude range -1.0 to 1.0), dBFS is calculated as `20 * log10(amplitude)`. A value of 0 dBFS is maximum amplitude.
        -   *Initial Value:* `-20.0` dBFS. (This will require testing and calibration based on typical microphone levels and environments. The test file had an average of -22 dBFS).
    -   `min_noise_duration_seconds`: The minimum duration an audio segment's RMS energy must stay above `rms_threshold_dbfs` to be flagged as a loud noise event. This helps filter out very brief, non-suspicious sounds (e.g., a single cough or click).
        -   *Initial Value:* `0.5` seconds.
    -   `noise_analysis_window_seconds`: The duration of the audio segment over which RMS energy is calculated for comparison against the threshold. This will likely align with the audio chunks received from the frontend (e.g., 1 to 5 seconds).
        -   *Initial Value:* To be determined by frontend chunking strategy (Sub-Task 1.4), likely `1.0` to `5.0` seconds.
-   **Logged Event Details:**
    -   `event_type`: "loud_noise_detected"
    -   `username`: (from JWT)
    -   `session_id`: (from client)
    -   `timestamp`: (server-side)
    -   `details`: 
        -   `peak_rms_dbfs`: The maximum RMS energy (in dBFS) detected during the event.
        -   `noise_duration_seconds`: The actual duration for which the noise was above the threshold.
        -   `rms_threshold_dbfs_used`: The dBFS threshold used for this detection.

*(End of new section 5.1)*

## 5.2. High-level Task Breakdown (Renumbered)
*(Previously Section 5)*

### Task 0: Setup Development Branch
*   **Sub-Task 0.1:** Create and switch to a new Git feature branch.
    *   Action: `git checkout main && git pull && git checkout -b feature/sound-detection`
    *   Success Criteria: New branch `feature/sound-detection` is created from the latest `main` and is active.

### Task 1: Research and Design Deep Dive
*   **Sub-Task 1.1:** Finalize browser API for microphone access.
    *   Action: Confirm `navigator.mediaDevices.getUserMedia` is suitable. Prototype basic audio capture in `App.js`.
    *   Success Criteria: Able to capture raw audio stream in the frontend. UI button to start/stop capture for testing. Browser console logs show audio data chunks being received.
*   **Sub-Task 1.2:** Select backend audio processing libraries.
    *   Action: Install and test `webrtcvad-wheels` and `librosa` with sample audio files.
    *   Success Criteria: Demonstrate successful VAD and RMS energy calculation in a Python script.
*   **Sub-Task 1.3:** Define specific sound event types and parameters.
    *   Action: Document thresholds for speech duration (e.g., 3 seconds), VAD aggressiveness, and loud noise RMS level (relative to typical ambient or absolute).
    *   Success Criteria: Clear definitions for `speech_detected` (with duration) and `loud_noise_detected` (with peak level and duration) events.
*   **Sub-Task 1.4:** Finalize data transmission strategy.
    *   Action: Decide between WebSockets and chunked POST. For initial simplicity, **chunked POST via HTTPS** is preferred. Define chunk size/duration (e.g., 5-second chunks).
    *   Success Criteria: Data format (e.g., raw PCM, WAV format in base64) and transmission frequency decided.
*   **Sub-Task 1.5:** Design backend API endpoint (`/api/analyze-audio`).
    *   Action: Specify request format (e.g., JSON with `audio_chunk_base64`, `sample_rate`, `session_id`, `username`) and response format (e.g., confirmation or list of detected events from that chunk).
    *   Success Criteria: OpenAPI/Swagger-like definition for the new endpoint.

### Task 2: Frontend Implementation (Audio Capture & Transmission)
*   **Sub-Task 2.1:** Implement microphone access UI and logic.
    *   Action: Add a button/toggle in `App.js` (perhaps in the `Monitoring` tab) to "Enable Sound Monitoring". Handle `getUserMedia` promise, permissions, and errors gracefully. Display status (e.g., "Sound monitoring active", "Microphone access denied").
    *   Success Criteria: User can grant/deny microphone permission. UI reflects current state. Raw audio stream is available when active.
*   **Sub-Task 2.2:** Implement audio chunking and formatting.
    *   Action: Use Web Audio API (e.g., `AudioContext`, `MediaStreamAudioSourceNode`, `ScriptProcessorNode` or `AudioWorkletNode`) to collect audio into chunks (e.g., 5 seconds of PCM data). Convert to required format (e.g., base64 encoded WAV).
    *   Success Criteria: Frontend can generate audio chunks in the defined format and size.
*   **Sub-Task 2.3:** Implement sending audio chunks to backend.
    *   Action: On an interval (matching chunk duration), send the latest audio chunk to `/api/analyze-audio` via `axios.post`. Include `session_id` and JWT token (via Axios interceptor).
    *   Success Criteria: Backend receives audio chunks successfully. Network requests are visible in browser dev tools.
*   **Sub-Task 2.4 (Optional - Phase 1 Defer):** Client-side VAD.
    *   Action: Integrate a JavaScript VAD library to analyze audio before sending. Only send chunks containing voice activity.
    *   Success Criteria: Reduction in data sent to backend when no speech is present. (Consider for later optimization if bandwidth/processing is an issue).

### Task 3: Backend Implementation (Audio Analysis & Event Logging)
*   **Sub-Task 3.1:** Create `/api/analyze-audio` endpoint in `app.py`.
    *   Action: Implement the Flask route. Authenticate using `@jwt_required`. Parse incoming audio data, `session_id`, `username`.
    *   Success Criteria: Endpoint is reachable and accepts audio data. Basic logging of received data.
*   **Sub-Task 3.2:** Implement VAD for speech detection.
    *   Action: Use `webrtcvad` on the received audio chunk. Aggregate speech segments to detect sustained speech exceeding the defined duration threshold.
    *   Success Criteria: Function can reliably identify speech periods in an audio chunk.
*   **Sub-Task 3.3:** Implement RMS analysis for loud noise detection.
    *   Action: Use `librosa` to calculate RMS energy for the audio chunk. Compare against a threshold (this might need to be dynamic or configurable later).
    *   Success Criteria: Function can identify segments exceeding the noise threshold.
*   **Sub-Task 3.4:** Log detected sound events to MongoDB.
    *   Action: If speech or loud noise is detected, create an event object (with `event_type`, `username`, `session_id`, `timestamp`, and `details` like `duration_seconds` for speech, or `peak_level_db` for noise) and insert it into `proctoring_events` collection.
    *   Success Criteria: Sound events are correctly stored in MongoDB.
*   **Sub-Task 3.5:** Add new sound event types to requirements.txt if necessary.
    *   Action: Add `webrtcvad-wheels`, `librosa` to `backend/requirements.txt`.
    *   Success Criteria: Dependencies are listed.

### Task 4: Frontend Implementation (Displaying Sound Events in Admin View)
*   **Sub-Task 4.0 (COMPLETED):** Correct Admin User Role.
    *   Action: Manually update the `role` field for the `admin` user in the `users` collection in MongoDB from `student` to `admin`.
    *   Success Criteria: The `admin` user has the `admin` role in the database, allowing access to admin-specific UI elements like the Event History tab. (Verified)
*   **Sub-Task 4.1 (COMPLETED):** Update Event History table in `App.js`.
    *   Action: Modify the admin's "Event History" table to correctly parse and display new sound event types (`loud_noise_detected`) and their relevant details from the `event.details` object. (Code updated in `App.js` to format dBFS values and filename).
    *   Success Criteria: Admin can see and understand sound-related events in the event log, with dBFS values rounded and filepath shortened. (Verified after browser hard refresh)
*   **Sub-Task 4.2 (RESOLVED):** Implement Audio Playback for Events in Event History.
    *   Action (Backend): Create a Flask endpoint (`/api/audio_files/<filename>`) to serve WAV files from `/app/audio_chunks/`. (Completed, `mimetype` explicitly set to `audio/wav`).
    *   Action (Frontend): Add a "Play" button to relevant events in `App.js`; on click, fetch and play the audio using an `<audio>` element. (Implemented. Playback now works when using the React dev server with the `"proxy": "http://localhost:5000"` setting in `package.json` which forwards requests to the backend. The dev server may choose an alternate port like 3004 if the configured one, e.g., 3003, is busy).
    *   Success Criteria: Admin can click a "Play" button next to an audio-related event (e.g., `loud_noise_detected`) in the Event History and hear the corresponding 5-second audio chunk.

### Task 5: Testing and Refinement
*   [ ] Sub-Task 5.1: Test microphone access and audio capture.
    *   Action: Verify on Chrome, Firefox. Test with different microphones. Test permission denial scenarios.
    *   Success Criteria: Audio capture works reliably. UI handles permissions correctly.
*   [ ] Sub-Task 5.2: Test backend audio analysis accuracy.
    *   Action: Send various test audio files/streams (speech, silence, background noise, sudden loud sounds) to the backend endpoint directly (e.g., via script/Postman) and verify event generation.
    *   Success Criteria: Backend correctly identifies defined sound events.
*   [x] **Sub-Task 5.3 (Largely Completed):** Full E2E testing.
    *   Action: User (as student) enables sound monitoring. Admin views event log. Test various scenarios (talking, loud noises, silence).
    *   Success Criteria: System works end-to-end. Events are logged and displayed correctly. (Verified: Loud noise and multiple face detection events observed correctly in E2E test).
*   [ ] **Sub-Task 5.4 (Provisionally Addressed):** Refine detection thresholds.
    *   Action: Based on E2E testing, adjust VAD sensitivity, speech duration, and noise level thresholds to optimize for accuracy and minimize false positives. This may be iterative.
    *   Success Criteria: System achieves a good balance between detecting genuine events and ignoring innocuous sounds. (Current `LOUD_NOISE_DBFS_THRESHOLD = -20.0` performed well in initial E2E test. Further testing may be needed for diverse conditions. Speech detection VAD not yet implemented).

### Task 6: Documentation and Merge
*   **Sub-Task 6.1:** Update `ai-proctor-docker/README.md`.
    *   Action: Document new sound monitoring feature, any user-facing controls, how admins see the events, and new backend dependencies.
    *   Success Criteria: README is updated.
*   **Sub-Task 6.2:** Update this implementation plan (`sound-detection.md`).
    *   Action: Fill in "Lessons Learned". Review and update any tasks/analyses based on actual implementation.
    *   Success Criteria: Plan reflects the final state of the feature.
*   **Sub-Task 6.3:** Merge `feature/sound-detection` to `main`.
    *   Action: Create PR, review, and merge.
    *   Success Criteria: Feature is integrated into `main`.

### Task 7: UI/UX Enhancements for Event History (NEW)
*   **Sub-Task 7.1:** Implement Pagination for Event History Table.
    *   Action: Modify `App.js` to add pagination controls to the Event History table, allowing users to navigate through large sets of events (e.g., 10-20 events per page).
    *   Success Criteria: Event History table displays events in pages. User can navigate to next/previous pages.
*   **Sub-Task 7.2 (Optional - Future):** Implement Filtering/Sorting for Event History.
    *   Action: Add controls to filter events by type, date range, or user, and sort by columns.
    *   Success Criteria: Admin can effectively filter and sort events to find specific information.

## 6. Project Status Board
*(To be filled by Executor)*

**LOGIN REGRESSION RESOLVED. Initial issue (MongoDB crashing) was due to 'No space left on device'. Docker system prune resolved disk space. Subsequent 401 errors were due to test users ('student1', 'esugabis', and 'admin') not being registered in the database. All necessary users have now been registered and login is functional.**

**AUDIO CHUNK TRANSMISSION & BASIC LOGGING IMPLEMENTED. Frontend captures, chunks, encodes (WAV/Base64), and sends audio. Backend receives, saves WAV, and logs 'audio_chunk_saved' event to MongoDB. Verified E2E.**

-   [x] **(COMPLETED)** Task 0: Setup Development Branch
    -   [x] Sub-Task 0.1: Create and switch to a new Git feature branch
-   [x] **(COMPLETED)** Task 1: Research and Design Deep Dive
    -   [x] Sub-Task 1.1: Finalize browser API for microphone access
    -   [x] Sub-Task 1.2: Select backend audio processing libraries (selected, initial testing done with test files, full integration for analysis pending)
    -   [x] Sub-Task 1.3: Define specific sound event types and parameters (initial definitions in place for `speech_detected` and `loud_noise_detected`, to be refined after analysis implementation)
    -   [x] Sub-Task 1.4: Finalize data transmission strategy (Chunked POST via HTTPS, 5-sec WAV/Base64 chunks)
    -   [x] Sub-Task 1.5: Design backend API endpoint (`/api/analyze-audio`) (Basic design complete for chunk reception)
-   [x] **(COMPLETED)** Task 2: Frontend Implementation (Audio Capture & Transmission)
    -   [x] Sub-Task 2.1: Implement microphone access UI and logic
    -   [x] Sub-Task 2.2: Implement audio chunking and formatting (WAV/Base64)
    -   [x] Sub-Task 2.3: Implement sending audio chunks to backend
    -   [ ] Sub-Task 2.4 (Optional - Phase 1 Defer): Client-side VAD
-   [ ] **(IN PROGRESS)** Task 3: Backend Implementation (Audio Analysis & Event Logging)
    -   [x] Sub-Task 3.1: Create `/api/analyze-audio` endpoint in `app.py` (Receives and processes chunks)
    -   [x] Sub-Task 3.2 (Partial - Saving): Implement backend logic to save received audio chunks to disk (Completed for verification)
    -   [x] Sub-Task 3.3 (COMPLETED - RMS & Threshold): Implement RMS analysis for loud noise detection (Core calculation and threshold logic in `app.py` - verified with backend logs and DB)
    -   [x] Sub-Task 3.4 (COMPLETED - Logging `loud_noise_detected`): Log detected sound events to MongoDB (Verified `loud_noise_detected` events with correct details in MongoDB).
    -   [x] Sub-Task 3.5 (Renamed from original 3.5): Add new sound event types to `requirements.txt` if necessary (Done for `librosa`, `numpy`).
-   [ ] **(PENDING)** Task 4: Frontend Implementation (Displaying Sound Events in Admin View)
    -   [x] Sub-Task 4.0 (COMPLETED): Correct Admin User Role.
    -   [x] Sub-Task 4.1 (COMPLETED): Update Event History table in `App.js`.
    -   [x] **Sub-Task 4.2 (RESOLVED):** Implement Audio Playback for Events in Event History.
-   [x] Task 5: Testing and Refinement (Audio Playback portion)
    -   [ ] Sub-Task 5.1: Test microphone access and audio capture
    -   [ ] Sub-Task 5.2: Test backend audio analysis accuracy
    -   [x] **Sub-Task 5.3 (Largely Completed):** Full E2E testing.
    -   [ ] Sub-Task 5.4: Refine detection thresholds
-   [ ] **(PENDING)** Task 6: Documentation and Merge
    -   [ ] Sub-Task 6.1: Update `ai-proctor-docker/README.md`
    -   [ ] Sub-Task 6.2: Update this implementation plan (`sound-detection.md`)
    -   [ ] Sub-Task 6.3: Merge `feature/sound-detection` to `main`
-   [ ] **(NEW)** Task 7: UI/UX Enhancements for Event History
    -   [ ] Sub-Task 7.1: Implement Pagination for Event History Table.
    -   [ ] Sub-Task 7.2 (Optional - Future): Implement Filtering/Sorting for Event History.

## 7. Executor's Feedback or Assistance Requests
*(To be filled by Executor)*

**[AUDIO PLAYBACK RESOLVED]: Implemented audio playback button and backend endpoint. Frontend fetches audio file successfully and playback now works. The issue was that the React Dev Server was not proxying `/api/...` requests to the backend. Adding `"proxy": "http://localhost:5000"` to the frontend's `package.json` and restarting the dev server resolved this. The dev server started on `http://localhost:3004` due to the configured port `3003` being busy, which is normal behavior.**

**[E2E TEST SUCCESSFUL]: Conducted an E2E test with a student user performing actions like talking, making loud noises, and having a second person enter the view. The admin user correctly observed `loud_noise_detected` events and `face_analyzed` events, including a `multiple_faces_detected` scenario. The current `LOUD_NOISE_DBFS_THRESHOLD = -20.0` seemed to perform appropriately in this test. This largely completes Sub-Task 5.3 and provides initial positive feedback for Sub-Task 5.4.**

**[ADMIN ROLE & EVENT DISPLAY VERIFIED]: The `admin` user's role was successfully updated to 'admin' in MongoDB. After a browser hard refresh, the 'Event History' tab is visible to the admin user. Both `face_analyzed` and `loud_noise_detected` events are appearing. The formatting for `loud_noise_detected` events (rounded dBFS values, shortened filepath) is correctly applied.**

**[ADMIN ROLE ISSUE IDENTIFIED]: Discovered that the 'admin' user, if registered through the standard UI, defaults to a 'student' role because the frontend registration form does not send a role, and the backend defaults to 'student'. This prevents the 'admin' from seeing the 'Event History' tab, which is necessary for testing Sub-Task 4.1. Immediate next step is to manually update the 'admin' user's role in the MongoDB `users` collection to 'admin'.**

**[INTERMITTENT LOGIN 401s RESOLVED]: Previously observed 401 errors in the frontend console during login attempts are no longer reproducible. After confirming users (admin, esugabis) are correctly registered in the database, fresh login attempts while monitoring the browser's Network tab show no 401 errors for the `/api/auth/login` or subsequent requests. It is concluded that the prior console errors were related to attempts made before user registration issues were fully resolved.**

**[LOUD NOISE DETECTION VERIFIED]: The `LOUD_NOISE_DBFS_THRESHOLD` (-20.0 dBFS) is correctly identifying audio chunks with `max_dbfs` above this value. Backend logs show `[LOUD_NOISE_EVENT]` messages and corresponding `[DB_EVENT] Logged 'loud_noise_detected' event.` messages. MongoDB `proctoring_events` collection contains `loud_noise_detected` events with appropriate details (peak_rms_dbfs, average_rms_dbfs, threshold_used, filepath, etc.). Specifically, the chunk with `max_dbfs: "-19.59"` from user's frontend logs was found as a `loud_noise_detected` event in both backend logs and MongoDB.**

**[LOGIN REGRESSION RESOLVED]: User reported login was broken (401 Unauthorized - "Bad username or password"). Previous MongoDB crash due to disk space was resolved. Further investigation showed test users were not present in the `users` collection. Registering 'student1', 'esugabis', and 'admin' resolved the issue. MongoDB data persistence for `users` across `docker-compose down/up` is confirmed.**

**Lesson: When debugging login, always verify user existence in the DB, especially if volumes were recently pruned or if data might not be seeding as expected.**

**[AUDIO CHUNK PIPELINE COMPLETE & COMMITTED]: Frontend now captures audio, prepares 5-second WAV chunks, Base64 encodes them, and POSTs them to the backend. The backend successfully receives these, decodes them, saves them as `.wav` files in `/app/audio_chunks/` within the container, and logs an `audio_chunk_saved` event to the `proctoring_events` collection in MongoDB. Playback of saved files and MongoDB event records have been verified. All changes committed and pushed to `feature/sound-detection` branch.**
**Identified and resolved MongoDB collection name mismatch (`events_collection` vs `proctoring_events`) during verification.**

*(Previous entries about CORS, Docker pruning, etc. are still relevant and kept below for history)*

## 8. Lessons Learned
*(To be documented as they arise)*
+ [2024-05-25] Explicit `RUN pip install <package>` commands in the Dockerfile can be more reliable than relying solely on `pip install -r requirements.txt` for ensuring critical packages are installed, especially if encountering module not found errors despite the package being in `requirements.txt`.
+ [2024-05-25] When Docker `COPY` commands fail with "not found" errors, rigorously verify the file's existence, exact name (case-sensitive), and path within the specified Docker build context on the host machine. The error `failed to compute cache key: failed to calculate checksum ... "/filename": not found` directly indicates the file is missing from the build context from Docker's perspective.
+ [2024-05-26] `librosa` (specifically its `audioread` backend) often requires `ffmpeg` to be installed in the environment for decoding MP3 and other audio formats. If `librosa.load()` fails for MP3s, ensure `ffmpeg` is installed and accessible in the `PATH` within the container/environment.
+ [2024-05-26] Warnings from underlying audio libraries (e.g., `libmpg123` for MP3s) like "Cannot read next header" can indicate a malformed, very short, or empty audio file, which can cause loading to fail even if `ffmpeg` is present.
+ [2024-05-26] MongoDB can fail with `pymongo.errors.ServerSelectionTimeoutError` (presenting as `Name or service not known` from the client) if the `mongod` process within its container is crashing or unhealthy. A common cause for such crashes is the Docker host running out of disk space, leading to "No space left on device" errors within the MongoDB container's logs when it tries to write to its journal or data files. Regularly pruning unused Docker images (`docker image prune -a -f`) and build cache (`docker builder prune -af`) is crucial to prevent this.

## 9. Debugging Login Regression (CORS & 500 Errors)

### 9.1. Blocker Identification
-   **Issue:** Login functionality regressed after frontend changes for Sub-Task 2.1 (Sound Detection - Mic Access UI).
-   **Symptoms:**
    -   Initial: Frontend console errors (CORS, 500 Internal Server Error).
    -   After disk space fix: Frontend UI shows "Bad username or password", backend returns 401 Unauthorized.
-   **Resolution:**
    -   The 500 errors were due to MongoDB container (`ai-proctor-mongodb`) crashing because of "No space left on device". This was fixed by Docker pruning.
    -   The subsequent 401 errors were because the test users (`student1`, `esugabis`, `admin`) were not present in the MongoDB `users` collection.
    -   Solution steps:
        1.  Identified MongoDB crash from `docker logs ai-proctor-mongodb`.
        2.  Confirmed "No space left on device" error.
        3.  Checked Docker disk usage with `docker system df`.
        4.  Pruned Docker build cache: `docker builder prune -af`.
        5.  Pruned unused Docker images: `docker image prune -a -f`.
        6.  Restarted services: `docker-compose -f ai-proctor-docker/docker-compose.yml down && docker-compose -f ai-proctor-docker/docker-compose.yml up -d --build`.
        7.  Verified backend and MongoDB were running.
        8.  Attempted login with `student1/password123` and `esugabis/alvaroalvaro`. Received 401.
        9.  Checked MongoDB `users` collection for `student1` and `esugabis` using `docker exec ... mongosh ... db.users.find(...)`. Users were not found.
        10. Registered `student1`, `esugabis` (by user via UI) and `admin` (by assistant via curl).
        11. User confirmed login successful for all registered users.
    -   **Status:** Login functionality is fully resolved.

### 9.2. Investigation and Diagnosis Plan (Completed)
1.  **Examine Backend Logs:** (Completed)
    *   Action: View the logs of the `ai-proctor-backend` Docker container.
    *   Result (Initial): Showed `pymongo.errors.ServerSelectionTimeoutError` due to MongoDB connection issues.
    *   Result (After disk fix): No specific Flask errors for login attempts, only standard Gunicorn/TensorFlow startup and successful DB connection messages. HTTP 401 responses were correctly generated.
2.  **Examine MongoDB Logs:** (Completed - Key for initial 500 error)
    *   Action: View the logs of the `ai-proctor-mongodb` container.
    *   Result: Showed `No space left on device` errors, WiredTiger panics, and fatal assertions.
3.  **Review CORS Configuration:** (Completed - Not the issue)
    *   Action: Inspect `app.py` for the `Flask-CORS` setup.
    *   Result: CORS setup (`CORS(app)`) was present and correct. Initial frontend errors were due to the 500 internal server error. Subsequent 401s are correct auth failures.
4.  **Check Recent Backend Changes (if any):** (Completed - Not the issue)
    *   Action: Review recent commits to `app.py` or related backend files.
    *   Result: No direct backend changes related to auth that would cause this. Problem was environmental (disk space) then data (missing users).
5.  **Check Docker Disk Space and Prune:** (Completed - Solved 500 errors)
    *   Action: Run `docker system df`, `docker builder prune -af`, `docker image prune -a -f`.
    *   Result: Significant disk space freed. MongoDB ran stably.
6.  **Verify User Existence in Database:** (Completed - Solved 401 errors)
    *   Action: Use `docker exec ai-proctor-mongodb mongosh ai_proctor_db --eval "db.users.find(...)"` to check for `student1` and `esugabis`.
    *   Result: Users not found. This is the cause of the 401 "Bad username or password" errors.

### 9.3. Original Investigation and Diagnosis Plan (Superseded by Disk Space Issue & Missing Users)
1.  **Examine Backend Logs:**
    *   Action: View the logs of the `ai-proctor-backend` Docker container for detailed error messages when a login attempt is made.
    *   Success Criteria: Identify the root cause of the 500 error on the `/api/auth/login` endpoint.
2.  **Review CORS Configuration:**
    *   Action: Inspect `app.py` for the `Flask-CORS` setup. Ensure `origins=["http://localhost:3001"]` (or a more permissive setting like `origins="*"`) is correctly configured and that `supports_credentials=True` is present.
    *   Success Criteria: CORS configuration in `app.py` is verified or corrected.
3.  **Check Recent Backend Changes (if any):**
    *   Action: Review recent commits to `app.py` or related backend files that might have inadvertently affected authentication or CORS. (Though the summary suggests changes were frontend-only for Sub-Task 2.1).
    *   Success Criteria: Confirm no unintended backend changes were introduced.

### 9.4. Project Status Board (Login Debugging)
-   [x] Task 0: Pause Sound Detection Work
    -   [x] Sub-Task 0.1: Update `sound-detection.md` Project Status to reflect pause.
-   [x] Task 1: Investigate Login Regression
    -   [x] Sub-Task 1.1: Examine Backend Logs
    -   [x] Sub-Task 1.2: Review CORS Configuration in `app.py`
    -   [x] Sub-Task 1.3: Check Recent Backend Changes (if any)
    -   [x] Sub-Task 1.4: Verify JWT and Authentication Logic in `app.py` (Logic deemed correct)
    -   [x] Sub-Task 1.5: Test Login Endpoint Directly (Effectively done via UI, confirmed 401s initially)
    -   [x] Sub-Task 1.6: Check Docker Disk Space (Solved initial 500s)
    -   [x] Sub-Task 1.7: Verify User Existence in Database (Identified cause of 401s)
-   [x] Task 2: Implement Fix for Login Regression
    -   [x] Sub-Task 2.1: Fix Backend Error (MongoDB disk space issue resolved)
    -   [x] Sub-Task 2.2: Correct CORS Configuration (Was not needed)
    -   [x] Sub-Task 2.3: Rebuild and Restart Docker Containers (Done after disk prune)
    -   [x] Sub-Task 2.4: Register Missing Test Users (`student1`, `esugabis`, `admin`)
-   [x] Task 3: Verify Fix
    -   [x] Sub-Task 3.1: Test Login Functionality E2E from UI (After user registration - SUCCESSFUL)