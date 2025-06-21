# Implementation Plan: Frontend Build Resolution

## 1. Background and Motivation

The frontend application (`ai-proctor-docker/frontend`) was experiencing persistent build and runtime errors. Initial build errors related to `axios`, `process/browser` polyfills, and various `Module not found` issues appear to have been largely resolved by reinstalling dependencies and applying `npm audit fix --force` (which updated `react-scripts` to `3.0.1`). The development server now starts on port 3001.

The focus shifts to runtime errors observed after these changes and ensuring basic functionality.

**Previous State (before `npm audit fix --force` and restart on new port):**
*   Alert: "Could not start video monitoring with backend."
*   Error: "Failed to load resource: Preflight response is not successful. Status code: 415" for `/api/student/monitoring/start`.
*   AudioDebug logs were accumulating, but the significance was unclear without the main functionality working.

**Current Goal:** Stabilize the application. Core proctoring features (video and audio monitoring initiation) must work. Specifically, the backend 500 error on `/api/analyze-audio` needs to be resolved.

## 2. Key Challenges and Analysis

*   **Impact of `react-scripts@3.0.1`**: This is an older version. The original project likely used a newer `react-scripts` (e.g., v4 or v5). Downgrading might have fixed some audit issues but could introduce incompatibilities with other dependencies or modern JavaScript features used in the existing codebase. This needs careful testing.
*   **Backend Audio Processing**: The 500 error on `/api/analyze-audio` indicates an issue within the backend logic. Enhanced logging has been added to `analyze_audio_chunk` in `app.py` to capture more detailed error information.
*   **CORS Configuration**: While `/api/analyze-face` seems to work regarding CORS, `/api/analyze-audio` (and potentially `/api/student/monitoring/start`) might still have subtle issues or errors masked by the backend 500 error.
*   **Frontend State Management & API Calls**: The logic for initiating video/audio monitoring needs to be robust, correctly handling API responses and errors.

## 3. High-level Task Breakdown

**Phase 1: Restore Core Monitoring Functionality (Executor)**

*   **Task 1.1: Clean Rebuild and Start (COMPLETED)**
    *   **Actions**:
        *   Killed conflicting processes.
        *   `cd frontend`
        *   `sudo rm -rf node_modules package-lock.json` (User executed manually)
        *   `npm install` (User executed manually)
        *   `npm audit fix --force` (Executed by assistant, `react-scripts` to `3.0.1`)
        *   `npm start -- --port 3001` (Executed by assistant, running in background)
    *   **Success Criteria**: Frontend development server starts. Backend service is confirmed as `Up`.
    *   **Status**: COMPLETED.

*   **Task 1.2: Initial Frontend Test & Console Log Review (Awaiting User)**
    *   **Actions**: User to access `http://localhost:3001` and perform basic interactions (e.g., login, attempt to start monitoring).
    *   **Success Criteria**: Collect all browser console errors and network request details (especially for `/api/student/monitoring/start` and `/api/analyze-audio`).
    *   **Status**: PENDING USER FEEDBACK

*   **Task 1.3: Diagnose and Fix `/api/student/monitoring/start` Issues (NEW)**
    *   **Actions** (Based on user feedback from Task 1.2):
        *   If CORS errors: Review backend `app.py` CORS setup (`CORS(app, ...)` and specific route OPTIONS handlers) for `http://localhost:3001`.
        *   If 415/400 errors: Review frontend `App.js` `startStudentSession` function. Ensure `Content-Type: application/json` is set and the JSON payload (e.g., `session_id`) matches backend expectations for `/api/student/monitoring/start`.
        *   Review backend `start_monitoring_session` in `app.py` for any unhandled exceptions or logic errors based on new logs.
    *   **Success Criteria**: `/api/student/monitoring/start` returns a 2xx success response. "Video monitoring started" (or similar) confirmed by frontend UI/alert. No related errors in browser console.
    *   **Status**: NOT STARTED

*   **Task 1.4: Diagnose and Fix `/api/analyze-audio` Issues (ON HOLD)**
    *   **Actions**: This task is on hold until frontend build/runtime is stable. Previous actions:
        *   Enhanced logging and error handling added to `analyze_audio_chunk` in `ai-proctor-docker/backend/app.py`. (COMPLETED)
        *   User provided backend logs, which showed `audio_data` was missing from the payload. (COMPLETED)
        *   Frontend `App.js` `processAndSendAudioChunk` function examined: found it was sending `audio_chunk_base64` instead of `audio_data`. (COMPLETED)
        *   Frontend `App.js` updated to send `audio_data` as the key for the base64 audio string. (COMPLETED)
    *   **Success Criteria**: `/api/analyze-audio` calls return 2xx success. Audio processing indicators on the frontend are normal. Backend logs show successful audio processing or clear, actionable error messages.
    *   **Status**: ON HOLD

*   **Task 1.5: Diagnose and Fix Face Capture (`imageSrc is null` or other issues) (ON HOLD)**
    *   **Actions**: This task is on hold. Previous actions:
        *   Initial user logs showed `/api/analyze-face` is now returning 200 OK. This is a good sign.
        *   Continue to monitor during further testing after audio issues are resolved.
        *   If `imageSrc is null` or other face capture problems reappear, review `captureAndAnalyze` in `App.js` and webcam integration.
    *   **Success Criteria**: Face capture provides valid image data consistently. `/api/analyze-face` is consistently successful.
    *   **Status**: MONITORING

**Phase 2: Address Minor Issues and `react-scripts` Implications (Executor)**

*   **Task 2.1: Address `favicon.ico` 404 Error** (As before)
*   **Task 2.2: Investigate and Address React Router Warnings** (As before)
*   **Task 2.3: Address ScriptProcessorNode Deprecation** (As before)
*   **Task 2.4: Evaluate Impact of `react-scripts@3.0.1` (NEW)**
    *   **Actions**: After core functionality is restored, assess if `react-scripts@3.0.1` causes any limitations or breaks features that worked previously. Consider a planned upgrade path if necessary.
    *   **Success Criteria**: Decision made on whether `react-scripts@3.0.1` is acceptable long-term or if an upgrade plan is needed.
    *   **Status**: NOT STARTED

## 4. Current Status / Progress Tracking

*   [X] **Task 1.1**: Clean Rebuild and Start
*   [ ] **Task 1.2**: Initial Frontend Test & Console Log Review (Awaiting User - will provide data for 1.3 and 1.4)
*   [ ] **Task 1.3**: Diagnose and Fix `/api/student/monitoring/start` Issues
*   [P] **Task 1.4**: Diagnose and Fix `/api/analyze-audio` Issues (ON HOLD pending frontend stability)
*   [M] **Task 1.5**: Diagnose and Fix Face Capture (`imageSrc is null`) (ON HOLD pending frontend stability)
*   [ ] **Task 2.1**: Address `favicon.ico` 404 Error
*   [ ] **Task 2.2**: Investigate and Address React Router Warnings
*   [ ] **Task 2.3**: Address ScriptProcessorNode Deprecation
*   [ ] **Task 2.4**: Evaluate Impact of `react-scripts@3.0.1`

## 5. Executor's Feedback or Assistance Requests

*   Frontend dependencies have been rebuilt (`react-scripts` to `3.0.1`), dev server started on `http://localhost:3001`. Backend service `Up`.
*   `/api/analyze-face` now appears to be working (200 OK from user logs).
*   **Backend `analyze_audio_chunk` in `app.py` has been updated with significantly more detailed logging and error handling to diagnose the 500 error.** (This is on hold as the frontend is not stable enough to test it.)
*   **Frontend `App.js` has been updated to send the correct `audio_data` key in the payload to `/api/analyze-audio`.** (This is on hold.)
*   **Frontend dependencies reinstalled (target `react-scripts@^5.0.1`). Server started on `http://localhost:3004` using `NODE_OPTIONS=--openssl-legacy-provider npm start -- --port 3004`.**
*   **Awaiting user to:**
    1.  **Provide the FULL terminal output from the `NODE_OPTIONS=--openssl-legacy-provider npm start -- --port 3004` command.** This is crucial for diagnosing the blank screen issue.
    2.  (If terminal is clean) Provide browser console logs from `http://localhost:3004`.

## 6. Branch Name

`fix/frontend-rebuild-runtime-errors` (Updated to reflect current focus)

## 7. Lessons Learned (from this iteration)

*   `npm audit fix --force` can significantly alter project dependencies (e.g., major version changes for `react-scripts`). While it can resolve security issues, it requires thorough testing to catch resulting incompatibilities or regressions.
*   When dealing with persistent frontend issues, a clean slate (`rm -rf node_modules package-lock.json`, `npm install`, `npm audit fix`) is a good, albeit sometimes drastic, step.
*   Always explicitly specify a port for dev servers (`npm start -- --port XXXX`) if there's a history of port conflicts.
*   [2025-05-28] Added from scratchpad: When facing persistent, complex build issues after multiple attempts, switching from an iterative Executor mode to a more structured Planner mode is beneficial to re-evaluate and form a systematic plan. (This was done prior to this rebuild attempt).
*   [2025-05-30] If a backend route returns a 500 error without clear tracebacks in the default logs, add comprehensive `try-except` blocks with detailed exception and `traceback.format_exc()` logging directly within the problematic route handler to pinpoint the source of the error. (Applied to `analyze_audio_chunk`).
*   [2025-05-30] Backend logs showing "No <expected_field> in request payload" alongside frontend logs confirming data generation usually points to a key name mismatch between the frontend payload and backend expectation. Double-check exact key names. (Applied to `/api/analyze-audio` payload).

## Acceptance Criteria (Overall for this Plan)

1.  The frontend application loads and is usable on `http://localhost:3001`.
2.  Core proctoring features (video and audio monitoring start, face analysis, audio analysis) function without critical errors.
3.  CORS issues are resolved.
4.  The impact of `react-scripts@3.0.1` is understood, and any necessary follow-up is planned. 