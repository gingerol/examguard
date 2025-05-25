# Implementation Plan: Proctoring Enhancements

## 1. Overview
This plan details the steps to implement enhancements for the AI Proctoring system, focusing on improving eye-tracking sensitivity and adding MongoDB event logging. It also outlines future development directions.

## 2. Branch Name
`feature/proctoring-enhancements`

## 3. Background and Motivation
The initial setup of the AI Proctoring system is complete. The next crucial steps are:
-   **Refine Core Functionality:** Address user feedback regarding the low sensitivity of the eye-tracking feature to make it more reliable.
-   **Enable Persistence and Audit:** Implement event logging to MongoDB to store proctoring data, which is essential for review and auditing purposes.
-   **Outline Future Growth:** Document planned future enhancements to guide further development.

## 4. Key Challenges and Analysis
*(To be filled in as challenges are identified and analyzed during execution)*

-   Ensuring the new eye-tracking logic correctly interprets various gaze directions without being overly sensitive or too lax.
-   Correctly integrating PyMongo with the Flask backend within the Docker environment.
-   Managing state and API calls effectively in the React frontend for the new event history tab.
-   Potential conflicts or issues arising from changes in deeply nested helper functions for eye tracking.

## 5. High-level Task Breakdown

### Task 0: Setup Development Branch
*   **Sub-Task 0.1:** Create and switch to a new Git feature branch.
    *   Action: `git checkout -b feature/proctoring-enhancements main` (assuming `main` is the base, or `feature/setup-environment-docker` if not yet merged)
    *   Success Criteria: New branch `feature/proctoring-enhancements` is created and active.

### Task 1: Improve Eye-Tracking Sensitivity
*   **Goal:** Modify the eye-tracking logic to be more sensitive to "looking away" events, based on user-provided code.
*   **Sub-Task 1.1:** Review existing `eye_tracker.py`.
    *   Action: Read the content of `ai-proctor-docker/backend/eye_tracker.py`.
    *   Success Criteria: Understand the current structure of `get_eye_status` and identify any existing helper functions related to eye aspect ratio or gaze calculation.
*   **Sub-Task 1.2:** Update `get_eye_status` function in `eye_tracker.py`.
    *   Action: Replace the existing `get_eye_status` function (or its core logic) with the new implementation provided by the user. This includes adjusting thresholds for `horizontal_threshold` and `vertical_threshold`. The function signature changes from `get_eye_status(img, shape, threshold_val=75)` to `get_eye_status(marks, face_region=None)`. Note: `app.py` passes `marks` (which are `shape` from `detect_marks`). The `img` argument is removed; ensure the new `get_eye_status` and its helpers (`eye_aspect_ratio`, `calculate_horizontal_gaze`, `calculate_vertical_gaze`) correctly use only `marks`.
    *   Success Criteria: `get_eye_status` function in `ai-proctor-docker/backend/eye_tracker.py` is updated with the new logic and thresholds.
*   **Sub-Task 1.3:** Add/Verify helper functions in `eye_tracker.py`.
    *   Action: Add or verify the presence and correctness of `eye_aspect_ratio(eye)`, `calculate_horizontal_gaze(eye)`, and `calculate_vertical_gaze(eye)` functions in `ai-proctor-docker/backend/eye_tracker.py` as provided by the user. Ensure `numpy` is imported as `np`.
    *   Success Criteria: All required helper functions are present and correctly implemented in `ai-proctor-docker/backend/eye_tracker.py`.
*   **Sub-Task 1.4:** Update `app.py` to call the modified `get_eye_status`.
    *   Action: The `get_eye_status` function signature changed. The `img` parameter was removed. Update the call in `ai-proctor-docker/backend/app.py` from `eye_status = get_eye_status(img, marks)` to `eye_status = get_eye_status(marks)`.
    *   Success Criteria: `app.py` correctly calls the updated `get_eye_status` function.
*   **Sub-Task 1.5:** Rebuild and restart Docker containers.
    *   Action: `cd ai-proctor-docker && docker compose down && docker compose build backend && docker compose up -d`
    *   Success Criteria: Docker containers are rebuilt and restarted without errors. Backend service is healthy.
*   **Sub-Task 1.6:** User E2E Testing and Feedback.
    *   Action: User to test the frontend at `http://localhost:3001`, specifically the eye-tracking sensitivity.
    *   Success Criteria: User confirms whether the sensitivity has improved as expected or provides further feedback for adjustments.

### Task 2: Implement MongoDB Event Logging
*   **Goal:** Integrate MongoDB to log proctoring events from the backend and display them on the frontend.
*   **Sub-Task 2.1:** Modify `app.py` for MongoDB integration.
    *   Action: Edit `ai-proctor-docker/backend/app.py`.
        1.  Add imports: `datetime`, `pymongo.MongoClient`.
        2.  Initialize MongoDB client and collection: `client = MongoClient(os.environ.get('MONGO_URI', 'mongodb://mongodb:27017/'))`, `db = client.proctoring_db`, `events_collection = db.proctoring_events`.
        3.  In `analyze_face` function:
            *   Get `session_id` from request form data (e.g., `session_id = request.form.get('session_id', 'unknown_session')`).
            *   Prepare `event_data` dictionary with `timestamp`, `session_id`, `event_type`.
            *   Log events for "no_face_detected", "multiple_faces", and "face_analyzed" (including `eye_status` and `looking_away`) by inserting `event_data` into `events_collection`.
    *   Success Criteria: `app.py` is updated to connect to MongoDB and log specified events.
*   **Sub-Task 2.2:** Add `/api/events` endpoint in `app.py`.
    *   Action: Edit `ai-proctor-docker/backend/app.py` to add a new route `/api/events` (GET request).
        1.  This endpoint should query `events_collection`.
        2.  Allow filtering by `session_id` (request argument).
        3.  Allow `limit` for the number of events (request argument).
        4.  Sort events by timestamp descending.
        5.  Convert `datetime` objects to ISO format strings before returning as JSON.
    *   Success Criteria: New `/api/events` endpoint is functional and returns event data from MongoDB.
*   **Sub-Task 2.3:** Modify `App.js` for Session ID and Event History Tab.
    *   Action: Edit `ai-proctor-docker/frontend/src/App.js`.
        1.  Add imports: `Tab, Tabs, Table` from `react-bootstrap`.
        2.  Add state variables: `sessionId` (default to `session_${new Date().getTime()}`), `events` (default to `[]`), `activeTab` (default to `'monitor'`).
        3.  Create `fetchEvents` async function to GET data from `/api/events` (using `sessionId` and a limit) and update `events` state.
        4.  Modify `captureAndAnalyze` function:
            *   Add `session_id` to the `FormData` sent to `/api/analyze-face`.
        5.  Add `useEffect` hook:
            *   To call `fetchEvents` when `activeTab` is `'events'`.
            *   Include an interval to periodically refresh events (e.g., every 5 seconds) when on the 'events' tab, and clear interval on component unmount or tab change.
        6.  Update the `return` statement:
            *   Wrap existing UI in a `<Tab eventKey="monitor" title="Monitoring">`.
            *   Add a new `<Tab eventKey="events" title="Event History">` containing a "Refresh Events" button and a `Table` to display event data (`timestamp`, `event_type`, `result`, `details` like `eye_status`, `face_count`, `looking_away`).
    *   Success Criteria: `App.js` is updated to send `session_id`, includes an "Event History" tab, and correctly fetches and displays events.
*   **Sub-Task 2.4:** Rebuild and restart Docker containers.
    *   Action: `cd ai-proctor-docker && docker compose down && docker compose build frontend backend && docker compose up -d`
    *   Success Criteria: Docker containers are rebuilt and restarted without errors. Backend and frontend services are healthy.
*   **Sub-Task 2.5:** Verify Event Logging and Display.
    *   Action:
        1.  Perform actions on the frontend (start monitoring, look away, etc.) to generate events.
        2.  Check the "Event History" tab on the frontend to see if events are displayed.
        3.  (Optional but recommended) Manually query MongoDB to confirm events are being stored: `docker exec -it ai-proctor-mongodb mongosh proctoring_db --eval "db.proctoring_events.find().pretty()"`
    *   Success Criteria: Events are correctly logged in MongoDB and displayed on the frontend.
*   **Sub-Task 2.6:** User E2E Testing.
    *   Action: User to test the event logging and display features.
    *   Success Criteria: User confirms the MongoDB logging and event history tab are working as expected.

### Task 3: Future Enhancements (High-Level Outline)
*   **Goal:** Document and plan for subsequent development phases.
*   **Sub-Task 3.1:** Merge `feature/proctoring-enhancements` to `main`.
    *   Action: After successful completion and verification of Tasks 1 & 2, create a Pull Request, review, and merge the `feature/proctoring-enhancements` branch into `main`.
    *   Success Criteria: Changes are integrated into the `main` branch.
*   **Sub-Task 3.2:** Implement User Authentication.
    *   Goal: Add a simple login system to track different users/students.
    *   Action: (Detailed planning to be done in a subsequent phase)
*   **Sub-Task 3.3:** Enhance Monitoring Features.
    *   Goal: Add additional proctoring capabilities.
    *   Action: (Detailed planning for features like audio analysis, browser tab switching, multiple face detection alerts to be done in a subsequent phase)
*   **Sub-Task 3.4:** Develop a Testing Suite.
    *   Goal: Create automated tests for frontend and backend.
    *   Action: (Detailed planning to be done in a subsequent phase)

## 6. Project Status Board
*(To be filled by Executor)*

-   [ ] Task 0: Setup Development Branch
    -   [x] Sub-Task 0.1: Create and switch to new Git feature branch
-   [ ] Task 1: Improve Eye-Tracking Sensitivity
    -   [x] Sub-Task 1.1: Review existing `eye_tracker.py`
    -   [x] Sub-Task 1.2: Update `get_eye_status` function in `eye_tracker.py`
    -   [x] Sub-Task 1.3: Add/Verify helper functions in `eye_tracker.py`
    -   [x] Sub-Task 1.4: Update `app.py` to call the modified `get_eye_status`
    -   [x] Sub-Task 1.5: Rebuild and restart Docker containers
    -   [.] Sub-Task 1.6: User E2E Testing and Feedback (Attempt 6: Logs collected. OR logic, H=0.07, V=0.05. Gaze values still too small to reliably trigger. Iteration needed.)
-   [ ] Task 2: Implement MongoDB Event Logging
    -   [ ] Sub-Task 2.1: Modify `app.py` for MongoDB integration
    -   [ ] Sub-Task 2.2: Add `/api/events` endpoint in `app.py`
    -   [ ] Sub-Task 2.3: Modify `App.js` for Session ID and Event History Tab
    -   [ ] Sub-Task 2.4: Rebuild and restart Docker containers
    -   [ ] Sub-Task 2.5: Verify Event Logging and Display
    -   [ ] Sub-Task 2.6: User E2E Testing
-   [ ] Task 3: Future Enhancements
    -   [ ] Sub-Task 3.1: Merge `feature/proctoring-enhancements` to `main`
    -   [ ] Sub-Task 3.2: Implement User Authentication (Requires detailed planning)
    -   [ ] Sub-Task 3.3: Enhance Monitoring Features (Requires detailed planning)
    -   [ ] Sub-Task 3.4: Develop a Testing Suite (Requires detailed planning)

## 7. Executor's Feedback or Assistance Requests
*(To be filled by Executor)*

-   Awaiting user E2E testing and backend logs for **Sub-Task 1.6** (Eye-Tracking Sensitivity, Attempt 6. OR logic, H_Thresh=0.07, V_Thresh=0.05. Debug logging active. This is Phase 1 of new recommendations).
+   User feedback on Sub-Task 1.6 (Attempt 6 with OR logic, H=0.07, V=0.05): Logs show gaze values still too small. Next step: Implement improved `calculate_vertical_gaze` from recommendations (Phase 2).

## 8. Lessons Learned
*(To be documented as they arise)* 