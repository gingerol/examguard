# Implementation Plan: Admin Multi-Student Dashboard

## 1. Background and Motivation

Currently, the admin interface only allows viewing a historical log of events. For effective real-time proctoring in a school setting, administrators need the ability to monitor multiple students simultaneously. This feature will provide a dashboard view where an admin can see live feeds or key status indicators from several active student sessions. This will enable more proactive identification of potential issues and a better overview of ongoing exams.

The primary motivation is to enhance the real-time monitoring capabilities of ExamGuard for administrators, making it a more powerful tool for overseeing exams with multiple participants.

## 2. Key Challenges and Analysis

*   **Real-time Data Streaming:** Efficiently streaming video/status data from multiple students to a single admin dashboard without overwhelming the server or client.
    *   *Consideration:* WebSockets or server-sent events (SSE) for status updates. Video might be snapshots or low-fps streams to conserve bandwidth.
*   **UI Design for Multiple Feeds:** Designing an intuitive and scalable UI that can display information from multiple students clearly.
    *   *Consideration:* Grid layout, paginated views, or a summary view with drill-down capabilities.
*   **Scalability:** The solution should be designed with scalability in mind, considering potentially many students being monitored.
    *   *Consideration:* Backend architecture needs to handle many concurrent connections and data processing. Active session store will initially be in-memory, but will need a distributed solution (e.g., Redis) for multi-instance deployments.
*   **Data Aggregation and Prioritization:** How to summarize or highlight critical alerts from multiple students.
    *   *Consideration:* Visual cues for students requiring attention.
*   **Backend API Endpoints:** New API endpoints will be needed to:
    *   Fetch a list of active student sessions for an admin.
    *   Provide data streams/snapshots for specific student sessions.
    *   Manage student session lifecycle (start, heartbeat, stop).
*   **Authentication and Authorization:** Ensuring only authorized admins can access this dashboard and view student data. This should align with the existing auth system.
*   **Filtering/Sorting:** Admins might need to filter or sort students (e.g., by those with recent alerts).

## 3. High-level Task Breakdown

1.  **Branch Creation:**
    *   Task: Create a new feature branch named `feature/admin-multi-student-dashboard` from `feature/sound-detection`.
    *   Status: COMPLETED
    *   Success Criteria: Branch created and pushed to the remote repository.
2.  **Backend - API Design & Development:**
    *   **Task 3.1: Design API endpoints for fetching active student sessions and their monitoring data.**
        *   **Endpoint 1: Get List of Active/Monitored Student Sessions**
            *   **HTTP Method:** `GET`
            *   **Path:** `/api/admin/dashboard/active_sessions`
            *   **Authentication:** Admin role required.
            *   **Request Parameters (Query):** `exam_id`, `department_id`, `school_id`, `sort_by`, `order`, `page`, `per_page` (all optional).
            *   **Response Body (JSON Array of Objects):**
                ```json
                [
                  {
                    "session_id": "unique_session_id_123",
                    "student_id": "student_user_id_abc",
                    "student_name": "Student, Alex",
                    *   "exam_id": "exam_789",
                    *   "monitoring_start_time": "YYYY-MM-DDTHH:MM:SSZ",
                    *   "last_snapshot_url": "/api/media/snapshots/session_123_latest.jpg",
                    *   "latest_status": "Looking Away",
                    *   "unread_alert_count": 3,
                    *   "last_alert_timestamp": "YYYY-MM-DDTHH:MM:SSZ"
                  }
                ]
                ```
        *   **Endpoint 2: Get Detailed Monitoring Data for a Specific Student Session (Less critical if WebSockets are primary)**
            *   **HTTP Method:** `GET`
            *   **Path:** `/api/admin/dashboard/session_data/<session_id>`
            *   **Authentication:** Admin role required.
            *   **Response Body (JSON Object):** Detailed status history, recent alerts, etc.
        *   **Endpoint 3: WebSocket/SSE Connection for Real-time Updates**
            *   **Path (WebSocket handshake):** `/ws/admin_dashboard`
            *   **Authentication:** Token-based.
            *   **Key Messages (Server to Client):** `student_session_update`, `new_student_session_started`, `student_session_ended` (payloads defined previously).
        *   Success Criteria: API contracts (REST and WebSocket/SSE messages) are clearly defined. Status: Definitions added.
    *   **Task 3.2: Implement backend logic to track active student sessions.**
        *   **Sub-Task 3.2.1: Define Data Structure for Active Sessions**
            *   *Details:* Store `session_id` (client-gen), `student_id` (JWT), `student_username`, `monitoring_start_time`, `last_heartbeat_time`. Optional: `exam_id`.
            *   *Storage Mechanism (Initial):* In-memory Python dictionary in Flask app (e.g., `active_sessions_store = {}`).
            *   *Scalability Note:* Defer distributed cache (e.g., Redis) for multi-instance setup.
            *   *Success Criteria:* Data structure documented in plan.
        *   **Sub-Task 3.2.2: Implement Student-Side Session Management Endpoints**
            *   *Endpoint A: Start/Register Monitoring* (`POST /api/student/monitoring/start`)
                *   Request: `{ "session_id", "exam_id" (optional) }`
                *   Action: Adds/updates session in `active_sessions_store`; sets start/heartbeat times; gets student info from JWT.
            *   *Endpoint B: Session Heartbeat* (`POST /api/student/monitoring/heartbeat`)
                *   Request: `{ "session_id" }`
                *   Action: Updates `last_heartbeat_time`.
            *   *Endpoint C: Stop Monitoring* (`POST /api/student/monitoring/stop`)
                *   Request: `{ "session_id" }`
                *   Action: Removes session from `active_sessions_store`.
            *   *Success Criteria:* Student client can manage session lifecycle (start, heartbeat, stop).
        *   **Sub-Task 3.2.3: Implement Server-Side Stale Session Cleanup (Optional for MVP)**
            *   *Details:* Plan for a periodic task (e.g., APScheduler or simple thread) to remove sessions with old `last_heartbeat_time` (e.g., > 2-5 mins).
            *   *Success Criteria:* Stale session cleanup strategy defined.
        *   **Sub-Task 3.2.4: Develop Internal Logic for Admin API to Access Active Sessions**
            *   *Details:* Create Python function for `/api/admin/dashboard/active_sessions` to read from `active_sessions_store`, format data, and apply filters/sorting if implemented.
            *   *Success Criteria:* Admin API can internally retrieve the list of active sessions.
        *   Overall Success Criteria for 3.2: Backend can identify, track, and list students currently being monitored.
    *   **Task 3.3: Implement backend logic to serve summarized monitoring data.**
        *   **Sub-Task 3.3.1: Define/Refine Data to be Stored per Active Session for Dashboard Display.**
            *   *Details:* Each entry in `active_sessions_store` needs to hold/manage:
                *   `session_id` (Primary Key)
                *   `student_id`, `student_username`
                *   `monitoring_start_time`, `last_heartbeat_time`
                *   `latest_face_analysis_status` (e.g., "Attentive", "Looking Away")
                *   `latest_face_snapshot_filename` (or path/URL)
                *   `latest_audio_event_summary` (e.g., "Loud Noise Detected")
                *   `unread_alert_count`
                *   `last_alert_timestamp`
            *   *Success Criteria:* Data fields for active session display are listed.
        *   **Sub-Task 3.3.2: Modify Existing Analysis Endpoints to Update Active Session Data.**
            *   *Endpoint `/api/analyze-face` Modification:*
                *   If `session_id` in `active_sessions_store`:
                    *   Update `latest_face_analysis_status`, `latest_face_snapshot_filename`.
                    *   If alert: increment `unread_alert_count`, update `last_alert_timestamp`.
                    *   Trigger WebSocket broadcast (Task 3.4).
            *   *Endpoint `/api/analyze-audio` Modification:*
                *   If `session_id` in `active_sessions_store`:
                    *   Update `latest_audio_event_summary`.
                    *   If alert: increment `unread_alert_count`, update `last_alert_timestamp`.
                    *   Trigger WebSocket broadcast (Task 3.4).
            *   *Success Criteria:* Analysis endpoints planned to update `active_sessions_store` & trigger WebSockets.
        *   **Sub-Task 3.3.3: Implement Logic for Admin API to Retrieve Formatted Session Data.**
            *   *Details:* Internal function for `/api/admin/dashboard/active_sessions` to read `active_sessions_store`, format data per API spec, and apply filters/sorting/pagination.
            *   *Success Criteria:* Admin API can serve initial list with summarized data.
        *   Overall Success Criteria for 3.3: Backend collects, stores, and makes summarized monitoring data available for admin dashboard via REST and prepares for WebSocket pushes.
    *   **Task 3.4: Implement WebSocket server-side logic for handling connections, authentication, and broadcasting messages.**
        *   **Sub-Task 3.4.1: Choose and Integrate WebSocket Library.**
            *   *Details:* Confirm `Flask-SocketIO`. Add to `requirements.txt` & `Dockerfile` (backend) if missing. Initialize `SocketIO` in `app.py` (e.g., `socketio = SocketIO(app, cors_allowed_origins="*")`).
            *   *Success Criteria:* WebSocket library chosen and basic integration in `app.py` planned.
        *   **Sub-Task 3.4.2: Implement WebSocket Connection Handling and Authentication.**
            *   *Details:* Define SocketIO event handler for connections (e.g., `@socketio.on('connect', namespace='/ws/admin_dashboard')`).
            *   Implement JWT authentication for WebSocket: client sends token on connection (e.g., in query or initial message); backend verifies token and admin role.
            *   Store authenticated admin client SIDs, possibly in a dedicated SocketIO room (e.g., `admin_dashboard_room`).
            *   *Success Criteria:* Admin clients can establish an authenticated WebSocket connection to the specified namespace.
        *   **Sub-Task 3.4.3: Implement Broadcasting Logic for Session Updates.**
            *   *Details:* Create helper function (e.g., `broadcast_to_admins(event_name, data)`) to `socketio.emit(event_name, data, room='admin_dashboard_room')`.
            *   This function to be called from `/api/analyze-face`, `/api/analyze-audio` (Task 3.3.2) and student session management endpoints (Task 3.2.2) to send `student_session_update`, `new_student_session_started`, `student_session_ended` messages.
            *   *Success Criteria:* Backend can broadcast defined WebSocket messages to connected, authenticated admin clients.
        *   **Sub-Task 3.4.4: (Optional) Implement Specific Admin Subscriptions/Rooms.**
            *   *Details:* For MVP, broadcast all relevant updates to a general admin room. Advanced per-exam/department rooms can be a future enhancement if needed.
            *   *Success Criteria:* Decision made (MVP: broadcast to all admins in a room).
        *   Overall Success Criteria for 3.4: Backend WebSocket server handles authenticated admin connections and broadcasts student session events in real-time.
    *   **Task 3.5: Enhance Alert Logging and Retrieval (NEW)**
        *   **Sub-Task 3.5.1: Define Detailed Alert Data Structure.**
            *   *Details:* Alerts should be stored persistently (e.g., in MongoDB `alerts` collection or extend `events` collection). Each alert should include: `alert_id` (unique), `session_id`, `student_id`, `student_username`, `timestamp`, `alert_type` (e.g., "Looking Away", "Multiple Faces", "Suspicious Sound", "Keyword Detected"), `severity` (e.g., "Low", "Medium", "High"), `details` (specific message, e.g., detected keywords), `snapshot_filename` (if applicable, linking to a stored image).
            *   *Success Criteria:* Alert data structure defined and documented.
        *   **Sub-Task 3.5.2: Modify Analysis Endpoints to Save Detailed Alerts.**
            *   *Details:* When `/api/analyze-face` or `/api/analyze-audio` detect an alert condition:
                *   Save a detailed alert record (as per 3.5.1) to the database.
                *   If a snapshot is relevant (e.g., for face alerts), ensure the snapshot is saved with a unique filename and this filename is stored in the alert record.
            *   *Success Criteria:* Analysis endpoints save comprehensive alert data to the database.
        *   **Sub-Task 3.5.3: Implement API Endpoint for Alert Log.**
            *   **HTTP Method:** `GET`
            *   **Path:** `/api/admin/alerts`
            *   **Authentication:** Admin role required.
            *   **Request Parameters (Query):** `session_id` (optional), `student_id` (optional), `date_from` (optional), `date_to` (optional), `alert_type` (optional), `severity` (optional), `page` (default 1), `per_page` (default 20), `sort_by` (default `timestamp`), `order` (default `desc`).
            *   **Response Body (JSON):** `{ "alerts": [DetailedAlertObject, ...], "total_pages": X, "current_page": Y, "total_alerts": Z }`
            *   *Success Criteria:* API endpoint for fetching paginated and filterable detailed alerts is implemented and functional.
        *   **Sub-Task 3.5.4: (Optional) API Endpoint for Retrieving Specific Snapshot.**
            *   **HTTP Method:** `GET`
            *   **Path:** `/api/admin/snapshots/<snapshot_filename>` (or by ID)
            *   **Authentication:** Admin role required.
            *   **Response:** Image file.
            *   *Details:* This might leverage existing mechanisms if snapshots are already served, or require a new dedicated endpoint.
            *   *Success Criteria:* Mechanism to retrieve a specific snapshot linked to an alert is available.
3.  **Frontend - Dashboard UI Implementation:**
    *   **Task 4.1: Design the basic layout for the multi-student dashboard.**
        *   Status: TODO
        *   **Sub-Task 4.1.1: Create Admin Dashboard Component & Routing.**
            *   Details: Create `frontend/src/components/AdminDashboard/AdminDashboard.js`. Add route in `App.js` for `/admin/dashboard`, ensuring it's admin-only.
            *   Success Criteria: `AdminDashboard.js` created. Admins can navigate to `/admin/dashboard`.
        *   **Sub-Task 4.1.2: Design Student Card Component.**
            *   Details: Create `frontend/src/components/AdminDashboard/StudentCard.js`. Define props (e.g., `sessionData`). Layout with MUI (`Card`, `CardMedia`, `Typography`). Static placeholders for data.
            *   Success Criteria: `StudentCard.js` created, statically renders a student's monitoring data view.
        *   **Sub-Task 4.1.3: Implement Main Dashboard Grid Layout.**
            *   Details: In `AdminDashboard.js`, use MUI `Grid`. Render mock `StudentCard`s. Ensure responsiveness.
            *   Success Criteria: `AdminDashboard.js` displays a responsive grid of mock `StudentCard`s.
    *   **Task 4.2: Implement frontend logic to fetch and display active student sessions on the dashboard.**
        *   Status: TODO
        *   **Sub-Task 4.2.1: Fetch Active Sessions.**
            *   Details: In `AdminDashboard.js`, `useEffect` to fetch from `GET /api/admin/dashboard/active_sessions` with JWT. Handle loading/error states. Store sessions in state.
            *   Success Criteria: Dashboard fetches and stores active sessions. Loading/error states handled.
        *   **Sub-Task 4.2.2: Render Dynamic Student Cards.**
            *   Details: In `AdminDashboard.js`, map over sessions in state, render `StudentCard` for each, passing data as props.
            *   Success Criteria: Dashboard dynamically renders `StudentCard`s based on API data.
    *   **Task 4.3: Implement frontend display for individual student monitoring data within their "card".**
        *   Status: TODO
        *   **Sub-Task 4.3.1: Refine `StudentCard.js` Data Display.**
            *   Details: `StudentCard.js` to correctly display all fields from `sessionData`. Use `CardMedia` for snapshot. MUI `Badge` for `unread_alert_count`. Conditional styling for alerts/status. Format timestamps.
            *   Success Criteria: `StudentCard.js` accurately displays dynamic data. Visual cues for alerts/status implemented.
    *   **Task 4.4: Integrate WebSocket client to update student cards in real-time.**
        *   Status: TODO
        *   **Sub-Task 4.4.1: Add WebSocket Client Library.**
            *   Details: Add `socket.io-client` to frontend `package.json` and install.
            *   Success Criteria: `socket.io-client` installed and listed as a dependency.
        *   **Sub-Task 4.4.2: Establish WebSocket Connection.**
            *   Details: In `AdminDashboard.js`, `useEffect` to connect to `/ws/admin_dashboard` with JWT in query. Handle `connect`, `disconnect`, `connect_error`, `connection_ack`, `auth_failed`. Cleanup on unmount.
            *   Success Criteria: Authenticated WebSocket connection established. Lifecycle handled. Cleanup implemented.
        *   **Sub-Task 4.4.3: Handle Real-time Session Updates via WebSockets.**
            *   Details: In `AdminDashboard.js`, listen for `new_student_session_started` (add to state), `student_session_ended` (remove from state), `student_session_update` (update item in state). Ensure efficient state updates.
            *   Success Criteria: Dashboard cards update in real-time based on WebSocket messages.
        *   **Sub-Task 4.4.4: (Optional) Display Real-time Alert Notifications.**
            *   Details: On `student_session_update` with new alert info, show global notification (e.g., MUI `Snackbar`).
            *   Success Criteria: Admins receive non-intrusive notifications for new alerts.
    *   **Task 4.5: (Optional/Stretch) Add UI controls for filtering or sorting students on the dashboard.**
        *   Status: TODO
        *   **Sub-Task 4.5.1: Implement Filter/Sort UI Elements.**
            *   Details: Add MUI `Select` (sorting), `TextField` (filtering by name) to `AdminDashboard.js`.
            *   Success Criteria: UI controls for filtering/sorting are present and functional.
        *   **Sub-Task 4.5.2: Implement Client-Side Filter/Sort Logic.**
            *   Details: Manage filter/sort criteria in state. Apply logic to sessions array before rendering.
            *   Success Criteria: Displayed grid updates based on filter/sort selections.
    *   **Task 4.6: Implement Detailed Alert Log View (NEW)**
        *   Status: TODO
        *   **Sub-Task 4.6.1: Create Alert Log Component & Routing.**
            *   Details: Create `frontend/src/components/AdminAlertLog/AdminAlertLog.js`. Add a route (e.g., `/admin/alerts`) and link from the main admin navigation/dashboard.
            *   Success Criteria: `AdminAlertLog.js` component created and routable.
        *   **Sub-Task 4.6.2: Implement Alert Fetching and Display.**
            *   Details: In `AdminAlertLog.js`, use `useEffect` to fetch data from `/api/admin/alerts`. Display alerts in a table (e.g., MUI `Table`) with columns for key alert data. Implement pagination controls.
            *   Success Criteria: Alert log displays paginated alerts from the API.
        *   **Sub-Task 4.6.3: Implement Filtering UI for Alert Log.**
            *   Details: Add UI elements (date pickers, select dropdowns for type/severity, text field for student/session) to `AdminAlertLog.js` for filtering. Trigger API refetch on filter changes.
            *   Success Criteria: User can filter the displayed alerts.
        *   **Sub-Task 4.6.4: Implement Click-to-View Details/Snapshot.**
            *   Details: Make alert rows clickable. On click, show a modal (or navigate to a detail page) displaying all alert information and the associated snapshot image (fetched via `/api/admin/snapshots/<filename>` or by embedding the direct URL if snapshots are publicly accessible within admin context).
            *   Success Criteria: Admin can view full alert details and associated snapshot.
    *   **Task 4.7: Enhance StudentCard for Alert Details (NEW)**
        *   Status: TODO
        *   **Sub-Task 4.7.1: Add Click Handler to StudentCard.**
            *   Details: Make `StudentCard` in `AdminDashboard.js` clickable to open a modal or navigate to a detailed view for that student's recent alerts/session info, potentially reusing parts of the Alert Log detail view.
            *   Success Criteria: Clicking a student card navigates to or opens a detailed view.
4.  **Testing & Refinement:**
    *   Task 5.1: Unit and integration tests for backend API endpoints.
    *   Task 5.2: Frontend component tests and end-to-end tests for dashboard functionality.
    *   Task 5.3: Performance testing with simulated multiple student sessions.
    *   Task 5.4: User acceptance testing (UAT) with admin persona.
5.  **Documentation:**
    *   Task 6.1: Update API documentation.
    *   Task 6.2: Document the new dashboard feature for end-users (admins).

## 4. Project Status Board

*   [x] **Branch Creation:** `feature/admin-multi-student-dashboard`
*   [x] **Backend - API Design & Development (Completed)**
    *   [x] Design API endpoints (Task 3.1)
    *   [x] Implement active session tracking (Task 3.2)
    *   [x] Implement monitoring data serving (Task 3.3)
    *   [x] Implement real-time update mechanism (WebSocket/SSE) (Task 3.4)
    *   [x] **Enhance Alert Logging and Retrieval (NEW) (Task 3.5)**
*   [x] **Frontend - Dashboard UI Implementation:**
    *   [x] **Task 4.1: Design basic dashboard layout (Completed)**
    *   [x] **Task 4.2: Implement fetching/display of active sessions (Completed)**
    *   [x] **Task 4.3: Implement display of individual student data (Completed)**
    *   [x] **Task 4.4: Integrate WebSocket client to update student cards in real-time (Completed)**
    *   [x] **Task 4.5: (Optional) Implement filtering/sorting (Completed for Alert Log)**
        *   [x] 4.5.1: Implement Filter/Sort UI Elements (Text/select/date filters and TableSortLabel implemented for Alert Log)
        *   [x] 4.5.2: Implement Client-Side Filter/Sort Logic (Filter and Sort state and API params implemented for Alert Log)
    *   [x] **Task 4.6: Implement Detailed Alert Log View (NEW) (Completed)** 
        *   [x] 4.6.1: Create Alert Log Component & Routing
        *   [x] 4.6.2: Implement Alert Fetching and Display
        *   [x] 4.6.3: Implement Filtering UI for Alert Log
        *   [x] 4.6.4: Implement Click-to-View Details/Snapshot
    *   [ ] **Task 4.7: Enhance StudentCard for Alert Details (NEW)** 
        *   [ ] 4.7.1: Add Click Handler to StudentCard
*   [ ] **Testing & Refinement:**
    *   [ ] Backend tests
    *   [ ] Frontend tests
    *   [ ] Performance tests
    *   [ ] UAT
*   [ ] **Documentation:**
    *   [ ] API documentation
    *   [ ] User documentation

## 5. Executor's Feedback or Assistance Requests

- Branch `feature/admin-multi-student-dashboard` created from `feature/sound-detection` and pushed to origin.
- Backend implementation for active session tracking, data aggregation, and WebSocket broadcasting is largely complete for MVP.
- Backend implementation for detailed alert logging (MongoDB `alerts` collection), alert retrieval API (`/api/admin/alerts` with full features), and snapshot saving/serving (`/api/admin/snapshots/<filename>`) is complete.
- Key additions in `ai-proctor-docker/backend/app.py`:
    - `Flask-SocketIO` integration with `eventlet`.
    - In-memory `active_sessions_store`.
    - Student session management endpoints: `/api/student/monitoring/(start|heartbeat|stop)`.
    - Admin endpoint: `/api/admin/dashboard/active_sessions`.
    - WebSocket namespace `/ws/admin_dashboard` with JWT authentication.
    - Broadcasting of session events: `new_student_session_started`, `student_session_ended`, `student_session_update`.
    - Modification of `/api/analyze-face` and `/api/analyze-audio` to update session store, save detailed alerts to `alerts` collection (including snapshots for face alerts), and broadcast.
    - New `alerts_collection` in MongoDB.
    - New `SNAPSHOT_DIR` for saving image snapshots.
    - New `/api/admin/alerts` endpoint with pagination, filtering, and sorting.
    - New `/api/admin/snapshots/<filename>` endpoint to serve snapshots.
- `requirements.txt` and `Dockerfile` updated for `Flask-SocketIO` and `eventlet`.
- Stale session cleanup (Task 3.2.3) is marked as TODO for MVP but can be implemented if issues arise.
- Frontend `AdminDashboard.js` and `StudentCard.js` created and integrated with routing.
- Frontend fetches initial active sessions, and token propagation fixes (`currentUser` prop) and `determineRedirectPath` in `App.js` have resolved earlier 401/logout issues.
- Frontend WebSocket client integrated, connects, and handles `new_student_session_started`, `student_session_update`, and `student_session_ended` events, updating the UI correctly.

- **Functional Testing Update (Core Real-time Dashboard VERIFIED):**
    - Admin login: SUCCESSFUL.
    - Dashboard initial load: SUCCESSFUL.
    - `new_student_session_started`: SUCCESSFUL (Card appears).
    - `student_session_update`: SUCCESSFUL (Card status text/image updates).
    - `student_session_ended`: SUCCESSFUL (Card disappears, alert seen).

- **ESLint Warnings in `App.js` (User Terminal):** User-reported ESLint warnings for `setSessionId`, `showLogin`, `setShowLogin` in `App.js` do not align with the current codebase and are considered stale or misreported. No code changes made.

- **Admin Alert Log Frontend (Tasks 4.6.1 - 4.6.4 & 4.5 refinement):**
    - `AdminAlertLog.js` component created and routing added in `App.js` (Task 4.6.1 COMPLETE).
    - Alert fetching from `/api/admin/alerts` with JWT token, display in MUI Table, and MUI TablePagination implemented (Task 4.6.2 COMPLETE).
    - Filter UI (TextFields, Selects, DatePickers) and state management added. Filters (including dates formatted as ISO strings) are passed to the API. Clearing filters implemented. (Task 4.6.3 COMPLETE).
    - Modal implemented to show detailed alert information when a table row is clicked. Snapshot image is fetched as a blob (with Auth header) and displayed using an object URL. (Task 4.6.4 COMPLETE).
    - Table sorting implemented using `TableSortLabel`. Clicking sortable column headers updates sort configuration and re-fetches data. (Task 4.5 refinement for Alert Log COMPLETE).

- **Next Steps:**
    - Task 4.7: Enhance `StudentCard` for Alert Details (optional).
    - Address npm vulnerabilities if deemed necessary by the user.
    - Conduct thorough testing of the Admin Dashboard and Alert Log features.

- **Previous Critical Issue (401 on Admin Dashboard):** RESOLVED.
- User has suggested a feature: taking periodic photo snapshots (e.g., 5 per hour) during student recording and displaying them on the admin dashboard. This is noted as a potential enhancement for later.
- **New Feature Request (Detailed Alert Logging & Viewing):** This is the current focus.

## 6. Lessons Learned (Path to Self-Correction)
*   **[2024-05-28] Node Version Criticality:** `react-scripts@5.0.1` (common with CRA) has known incompatibilities with very recent Node.js versions (e.g., v22.x, v23.x). **Stick to LTS versions (e.g., v20.x)** for frontend development to avoid cryptic build failures (e.g., `ENOENT` for `react-router/dist/index.js`, `.pack` file errors, webpack module resolution issues).
    *   *Correction:* User switched to Node v20.x, resolving persistent build issues.
*   **[2024-05-28] CORS Configuration Specificity:** When using `Flask-CORS` with `resources={...}`, ensure options like `allow_headers`, `methods`, `supports_credentials` are *within* the resource-specific dictionary, not top-level arguments to `CORS()` if you are defining per-resource CORS rules.
    *   *Correction:* Corrected `CORS(app, resources={r"/api/*": {"origins": "http://localhost:3003", "allow_headers": ["Content-Type", "Authorization"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "supports_credentials": True}})`.
*   **[2024-05-28] Dependency Verification:** Always double-check `requirements.txt` (backend) and `package.json` (frontend) for all necessary libraries after planning new features (e.g., `Flask-JWT-Extended`, `librosa` were missed initially).
    *   *Correction:* Added missing dependencies.
*   **[2024-05-28] `curl` for `multipart/form-data` with JSON:** When sending `multipart/form-data` that includes a JSON string as one of the parts using `curl -F`, ensure the JSON string is properly quoted (usually single quotes around `key='{...}'`). If the server endpoint expects `application/json` instead of `multipart/form-data` for file uploads (e.g., file content base64 encoded within the JSON), adjust the `curl` command and backend accordingly. Mismatched `Content-Type` expectations are a common source of errors.
    *   *Correction:* For `/api/analyze-audio`, switched to sending `application/json` with a base64 encoded audio string, matching backend expectations.
*   **[2024-05-28] Backend Image/Audio Processing Input:** Ensure dummy data used for testing (e.g., via `curl`) is in a valid format that the backend processing libraries (e.g., OpenCV, Librosa) can actually read. A simple text string saved as `.jpg` or `.wav` will cause errors in these libraries.
    *   *Correction:* Used a tiny valid PNG for image testing and a base64 encoded valid (though silent) WAV for audio testing.
*   **[2024-05-29] React `useCallback` Dependencies:** Be mindful of the dependency array in `useCallback`. Including rapidly changing state (like `sessions` that updates on every WebSocket message) in the `useCallback` for a WebSocket event handler that *itself* updates that state can lead to re-creation of the handler and potential re-subscription loops or excessive re-renders. Only include dependencies that, if changed, *require* the callback to be re-created.
    *   *Correction:* Removed `sessions` from `handleSessionUpdate` `useCallback` dependency array in `AdminDashboard.js`.
*   **[2024-05-29] Frontend Token Management for API Calls & WebSockets:** When dealing with authentication tokens, ensure components that make API calls or establish WebSocket connections have access to the most current token. Passing the token (or the `currentUser` object containing it) as props from a central auth state manager (like `App.js`) to child components is more reliable than each component trying to read from `localStorage` directly, especially around login/logout transitions or if token refresh mechanisms were in play. Also, ensure that any `useEffect` hooks responsible for fetching data or connecting to WebSockets include the token (or `currentUser`) in their dependency array if the token can change or become available after initial render.
    *   *Correction:* Modified `AdminDashboard.js` to accept `currentUser` as a prop and use `currentUser.token`. `App.js` modified to pass this prop. Added `currentUser` to `AdminDashboard.js` `useEffect` dependency arrays for data fetching and WebSocket connection.
*   **[2024-05-29] React Component Unmount & Re-render Loops:** If a component is unexpectedly unmounting and remounting (often visible with WebSocket connect/disconnect logs), check for issues in parent components that might be causing its containing state to reset or its key to change. Errors in routing logic (like a missing redirect function) can cause the entire view to re-evaluate and unmount child components, leading to loss of their internal state or context.
    *   *Correction:* Identified and fixed missing `determineRedirectPath` in `App.js` as the likely cause of unexpected unmounts/remounts of `AdminDashboard` and subsequent token/WebSocket issues.