# Implementation Plan: Feature Enhancements Batch 1

## Branch Name
`feature/feature-enhancements-batch-1`

## Background and Motivation
The frontend application is now rendering after resolving critical build and runtime errors. However, several features are either not working as expected (regressions or bugs) or are planned features that have not yet been implemented. This plan outlines the tasks to address these items to improve the functionality and user experience of the admin dashboard and related proctoring features.

The user has identified the following areas for improvement:
- Admin dashboard should only show active sessions.
- Student session boxes on the admin dashboard should be clickable for more details.
- Photo snapshots should be available.
- The "Alert log" page needs cleanup and better organization.
- Audio logs should be clickable to play.
- User categories (school, department, student) need to be implemented.

## Key Challenges and Analysis

*   **Admin Dashboard - Active Sessions Only**:
    *   Frontend: Modify the component to filter or request only active sessions.
    *   Backend: Ensure the API endpoint (`/api/admin/active_sessions` or similar) correctly returns only currently active student sessions. May involve changes to WebSocket event handling or database queries.
*   **Clickable Student Session Boxes**:
    *   Frontend: Implement routing (e.g., using React Router) to a new detailed session view page. Pass session ID or relevant data. Create a new component for the detailed view.
    *   Backend: Potentially new API endpoints to fetch detailed data for a specific session if not already available.
*   **Photo Snapshots Availability**:
    *   Frontend: Display photo snapshots in the student detail view and potentially in the alert log.
    *   Backend: Ensure photo snapshots are being captured, stored reliably (e.g., filesystem, cloud storage), and are accessible via an API endpoint. This might involve reviewing/enhancing the proctoring event capture logic.
*   **Alert Log Cleanup**:
    *   Frontend: Implement UI improvements such as pagination, filtering (by student, date, alert type), sorting, and possibly a more compact display for individual log entries.
    *   Backend: API endpoints might need to be enhanced to support pagination, filtering, and sorting of alert logs.
*   **Clickable Audio**:
    *   Frontend: Integrate an audio player component into the alert log or student detail view. Fetch audio file/stream URL.
    *   Backend: Ensure audio logs are stored and accessible via an API. The API should provide a direct link or stream for the audio.
*   **User Categories (School, Department, Student)**:
    *   Frontend: UI for managing these categories (if admins can manage them). Display of these categories in relevant views (user profiles, student lists).
    *   Backend: Significant data model changes (new tables/fields for schools, departments, and linking users to them). API endpoints for CRUD operations on these categories and for associating users with them. This is a larger feature and may need its own sub-plan if it becomes too complex.

## High-level Task Breakdown

**Phase 1: Admin Dashboard Core Functionality**

1.  **Task 1.1 (Branching):** Create a new feature branch `feature/feature-enhancements-batch-1` from `main` (or the current development branch).
    *   **Success Criteria:** Branch created and checked out.
2.  **Task 1.2 (Admin Dashboard - Active Sessions UI):** Modify the Admin Dashboard UI to initially attempt to filter or display only sessions marked as "active".
    *   **Success Criteria:** Admin dashboard view updates, and if mock data is used, it only shows active sessions. API call (if any) is identified for backend changes.
3.  **Task 1.3 (Admin Dashboard - Active Sessions API):** Ensure the backend API endpoint for fetching student sessions for the admin dashboard returns *only* active sessions.
    *   **Success Criteria:** API endpoint (`/api/admin/active_sessions` or similar) tested and verified to return only active sessions. Admin Dashboard UI correctly displays only live sessions from the backend.
4.  **Task 1.4 (Admin Dashboard - Clickable Session Boxes UI):** Make student session boxes on the Admin Dashboard clickable. Implement basic routing to a placeholder "Student Detail" page, passing the `session_id`.
    *   **Success Criteria:** Clicking a session box navigates to a new route (e.g., `/admin/session/:sessionId`). The `sessionId` is correctly passed and accessible on the placeholder page.
5.  **Task 1.5 (Admin Dashboard - Student Detail Page UI - Basic Layout):** Create a basic layout for the "Student Detail" page. This page will eventually show more details, including photo snapshots and other logs for that specific student session.
    *   **Success Criteria:** A new page/component renders when navigated to, displaying at least the `session_id`.

**Phase 2: Alert Log Enhancements**

6.  **Task 2.1 (Alert Log UI - Initial Cleanup Review):** Analyze the current "Alert Log" page and identify specific areas for immediate UI cleanup (e.g., data density, readability).
    *   **Success Criteria:** Documented list of small, actionable UI improvements.
7.  **Task 2.2 (Alert Log UI - Implement Basic Cleanup):** Implement 1-2 high-impact UI cleanup changes identified in Task 2.1.
    *   **Success Criteria:** Alert Log page is visibly improved in terms of readability or data presentation.
8.  **Task 2.3 (Alert Log UI - Clickable Audio Placeholder):** Add a placeholder or icon indicating where clickable audio playback will be for audio-related alerts.
    *   **Success Criteria:** UI element for audio playback is present but not yet functional.

**Phase 3: Media Integration (Photos & Audio Playback)**

9.  **Task 3.1 (Photo Snapshots - API Check):** Verify or implement a backend API endpoint to retrieve photo snapshots for a given session/student.
    *   **Success Criteria:** API endpoint exists and returns data (even if mock initially) for photo snapshots.
10. **Task 3.2 (Photo Snapshots - Student Detail UI):** Display photo snapshots on the "Student Detail" page.
    *   **Success Criteria:** Photos are displayed on the student detail page when available.
11. **Task 3.3 (Audio Playback - API Check):** Verify or implement a backend API endpoint to retrieve/stream audio log files.
    *   **Success Criteria:** API endpoint exists and provides a way to access audio files.
12. **Task 3.4 (Audio Playback - Alert Log UI):** Implement actual audio playback functionality in the Alert Log for audio-related alerts.
    *   **Success Criteria:** Clicking the audio icon/button plays the associated audio log.

**Phase 4: User Categories (Further planning might be needed for this larger feature)**

13. **Task 4.1 (User Categories - Data Model & API Design):** Define database schema changes and API endpoints required for Schools, Departments, and linking Students.
    *   **Success Criteria:** Documented data model and API design.
14. **Task 4.2 (User Categories - Backend Implementation):** Implement backend changes for user categories.
    *   **Success Criteria:** Database migrations complete, API endpoints for CRUD operations on categories and user associations are functional.
15. **Task 4.3 (User Categories - Frontend UI):** Implement frontend UI to display and potentially manage user categories.
    *   **Success Criteria:** User categories are visible in relevant parts of the application.

*(Further tasks will be added as these are completed or if new requirements arise)*

## Project Status Board
*(To be filled by Executor as tasks progress)*

- [x] Task 1.1 (Branching): Create `feature/feature-enhancements-batch-1`
- [ ] Task 1.2 (Admin Dashboard - Active Sessions UI)
- [ ] Task 1.3 (Admin Dashboard - Active Sessions API)
- [x] Task 1.4 (Admin Dashboard - Clickable Session Boxes UI)
- [x] Task 1.5 (Admin Dashboard - Student Detail Page UI - Basic Layout)
- [ ] Task 2.1 (Alert Log UI - Initial Cleanup Review)
- [ ] ... (subsequent tasks)

## Executor's Feedback or Assistance Requests
*(To be filled by Executor)*
*   Task 1.1 (Branching) Completed.
*   Task 1.2 (Admin Dashboard - Active Sessions UI): Reviewed `AdminDashboard.js`. The component appears to be structured to display active sessions by fetching from `/api/admin/dashboard/active_sessions` and using WebSocket events (`new_student_session_started`, `student_session_ended`).
    *   **Investigation (Ended Sessions Not Disappearing / Multiple User Sessions):**
        *   Backend (`app.py`):
            *   The `/api/student/monitoring/stop` route correctly deletes a specific session from `active_sessions_store` and emits `student_session_ended`.
            *   The `/api/admin/dashboard/active_sessions` correctly reads from `active_sessions_store`.
            *   Identified that `start_monitoring_session` did not clean up pre-existing sessions for the same user if a new session was started with a new `session_id` (e.g., due to frontend re-initiating). This could lead to multiple "active" sessions for the same user in the backend store.
        *   Frontend (`AdminDashboard.js`): The `handleSessionEnded` event handler correctly filters a session from the local state when the event is received.
        *   Frontend (`App.js`):
            *   Previously identified a potential timing issue where `stopStudentSession` might be called with a placeholder `sessionId`. Fix was applied to ensure it's called with a backend-confirmed ID.
    *   **Fixes Applied:**
        *   **Backend (`app.py` - `start_monitoring_session`):** Modified to iterate through `active_sessions_store` before adding a new session. If any existing sessions are found for the same `student_username`, they are deleted from the store, and a `student_session_ended` event is emitted for each. This ensures a user can only have one "active" session entry at a time.
        *   **Frontend (`App.js` - `stopStudentSession` / `toggleMonitoring`):** Modified to ensure stop attempts only proceed with a backend-confirmed `sessionId`.
        *   **Frontend (`AdminDashboard.js` - WebSocket Stability):** 
            *   Observed WebSocket connection instability (disconnecting and reconnecting, messages about connection closed before establishment, flickering dashboard, multiple sessions appearing).
            *   Attempt 1: Refined `useEffect` dependency array to `[currentUser?.token, handleNewSession, handleSessionEnded, handleSessionUpdate, setError, handleShowSnackbar]`.
            *   Attempt 2: Wrapped `handleShowSnackbar` in `useCallback` to stabilize its reference. Updated dependency arrays of `handleNewSession`, `handleSessionEnded`, `handleSessionUpdate` to include the now stable `handleShowSnackbar`.
            *   Attempt 3 (Current): Further refactored the main `useEffect` in `AdminDashboard.js`. Improved conditions for establishing new socket connections (check `!socketRef.current || socketRef.current.disconnected`). Ensured old socket instances are explicitly disconnected and listeners removed (`socketRef.current.off()`) before creating new ones. Added reconnection options to the socket. Refined cleanup logic. Changed error handling for `fetchActiveSessions` to use `handleShowSnackbar` more consistently. The dependency array for this `useEffect` is now `[currentUser?.token, handleNewSession, handleSessionEnded, handleSessionUpdate, handleShowSnackbar, error]` - the inclusion of `error` will be monitored for potential loops.
        *   **Frontend (`App.js` - Student Stop Session & Video Start):** 
            *   Observed "Cannot stop: Session not fully initialized" error on student page.
            *   Introduced `isSessionStarting` state to track if `startStudentSession` is awaiting backend confirmation.
            *   Disabled the "Stop Monitoring" button while `isSessionStarting` is true (and `isMonitoring` is true).
            *   Added a safeguard in `toggleMonitoring` to prevent stopping if `isSessionStarting` is true.
            *   **Video Start Failure & ESLint:** Addressed "Could not start video monitoring with backend" and ESLint warnings.
                *   Passed `isSessionStarting` prop to `StudentMonitorPage` to fix `no-undef` error.
                *   Renamed `setSessionId` from `useState` to `setSessionIdInternal` to avoid conflict and clarify usage; the original separate `setSessionId` causing a warning should be resolved.
                *   Added more detailed console logging to `startStudentSession` and `startVideoMonitoring` (within `toggleMonitoring`) to trace `session_id` generation, backend confirmation, and potential failure points for video startup.
            *   **Placeholder Session ID for `captureAndAnalyze`**: Resolved issue where `captureAndAnalyze` was using a frontend-generated placeholder `sessionId`. 
                *   Modified `toggleMonitoring` in `App.js` to set `setIsMonitoring(true)` only *after* `startStudentSession` successfully returns a backend-confirmed `sessionId`.
                *   Removed the unused `imageCaptureIntervalRef` from `App.js` to clear an ESLint warning.
                *   **Attempt 2:** Refined the `useEffect` hook that starts the `captureAndAnalyze` interval. It previously checked `isMonitoring && sessionId && !sessionId.startsWith('session_')`. Added more robust webcam readiness checks (for `webcamRef.current` and `getScreenshot()`) in `captureAndAnalyze`. Corrected `useState` for `sessionId` to use `setSessionIdInternal` consistently.
                *   **Attempt 3:** The check `!sessionId.startsWith('session_')` in the `captureAndAnalyze` interval's `useEffect` was removed. The backend's `/api/student/monitoring/start` route was found to return the same `session_id` format (starting with `session_`) as the frontend's placeholder, making the check ineffective. The corrected logic now relies on `isMonitoring` being true (which is only set after a successful backend session start) and `sessionId` being truthy. The interval now correctly starts with the backend-confirmed `sessionId`.
        *   **Backend (`app.py` - `/api/analyze-face` 500 Error):** 
            *   Identified a 500 Internal Server Error when the frontend posts to `/api/analyze-face`.
            *   **Root Cause (Previous):** The `analyze_face` function was attempting to access and update `active_sessions_store[session_id]['users'][current_user_identity]`. However, the `active_sessions_store` entries, as initialized by `start_monitoring_session`, are flat dictionaries per `session_id` and do not have a nested `'users'` key. This mismatch in expected data structure caused a `KeyError` or `TypeError`.
            *   **Fix Applied (Previous):** Refactored the data update logic within `analyze_face` to directly access and update `active_sessions_store[session_id]`. The updated fields (e.g., `last_seen`, `last_face_analysis_status`, `last_alert_type`, `last_heartbeat_time`) are now written to the correct flat structure. The `socketio.emit('session_update', ...)` payload was also adjusted to send the entire updated `session_entry` as the `data` field.
            *   **Current Issue (Persistent 500 Errors):** Despite the previous fix, 500 errors from `/api/analyze-face` continue to occur.
            *   **Fix Applied (Current):** Added more robust `try-except` blocks within the `analyze_face` function in `app.py`. This includes specific error handling for database insertions (to `events_collection` and `alerts_collection`) and a broader `try-except` block around the main computer vision processing logic. This is intended to catch any further unhandled exceptions and provide more detailed error information in the backend logs and potentially in the JSON response, to help pinpoint the persistent issue.
        *   **Frontend (`App.js` - Session Stopping Logic):**
            *   **Issue:** Console logs showed errors like "Cannot stop session: Valid session ID from backend not yet available..." and "Attempted to stop session without a valid backend-confirmed session ID..." even when the `sessionIdInternal` seemed to hold the correct backend-confirmed ID.
            *   **Root Cause Analysis:** The validation logic within `toggleMonitoring` (or `stopStudentSession`) for stopping a session was likely too strict or using an outdated pattern to check if `sessionIdInternal` was "valid" for stopping (e.g., checking against a placeholder prefix that is no longer relevant once the backend confirms the ID, or an `isSessionStarting` flag not being reset correctly before a stop attempt).
            *   **Fix Applied:** Modified the `toggleMonitoring` function in `App.js`. When attempting to stop a session (`isMonitoring` is true), the logic now primarily relies on `isSessionStarting` being `false`. If these conditions are met, `sessionIdInternal` is considered valid and used to call `stopStudentSession`. Problematic or redundant checks on the format or "confirmed" status of `sessionIdInternal` for the *stopping* action have been removed. A basic check for `sessionIdInternal` truthiness remains as a sanity check.
            *   **Correction (ESLint Errors):** The previous modification introduced ESLint errors due to undefined variables. Corrected these by:
                *   Using the state variable `sessionId` for reading the session ID instead of `sessionIdInternal` (which is the setter).
                *   Replacing calls to the non-existent `showSnackbar` with the existing `addAlert` function.
                *   Replacing calls to the non-existent `setVideoMonitoringStatus` with the existing `setStatus` function.
*   Task 1.3 (Admin Dashboard - Active Sessions API):
    *   The backend route `get_active_dashboard_sessions` in `app.py` correctly returns all sessions from the in-memory `active_sessions_store`.
    *   The accuracy of this store now heavily relies on:
        1.  Reliable execution of `/api/student/monitoring/stop` (improved by frontend `App.js` changes).
        2.  The new cleanup logic in `/api/student/monitoring/start` ensuring only one session per user is active.
*   Task 1.4 (Admin Dashboard - Clickable Session Boxes UI): Completed. Modified `StudentCard.js` to be a `Link` (using `CardActionArea` and `RouterLink`) to `/admin/session/:sessionId`. Created `StudentSessionDetail.js` as a placeholder route target. Added route in `App.js`.
*   Task 1.5 (Admin Dashboard - Student Detail Page UI - Basic Layout): Completed. The placeholder `StudentSessionDetail.js` created in Task 1.4 fulfills the requirements by displaying the `sessionId`.

## Lessons Learned
*(To be populated from docs/scratchpad.md and as new lessons emerge)*
*   [YYYY-MM-DD] Ensure `axios` version is compatible with Create React App v4 (e.g., `axios@0.21.4`) if encountering `process/browser` errors.
*   [YYYY-MM-DD] `react-app-rewired` with a `config-overrides.js` is necessary for polyfilling Node.js core modules in CRA4 when dependencies require them. Install `process`, `stream-browserify`, `util`, `buffer`. 