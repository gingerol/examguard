# Implementation Plan: Screen Sharing and Monitoring

## 1. Overview
This plan details the steps to implement screen sharing and monitoring capabilities into the AI Proctoring system. The goal is to detect if a student navigates away from the exam window or opens unauthorized applications. The initial focus will be on detecting tab/window focus changes away from a designated exam URL/application and logging these events.

## 2. Branch Name
`feature/screen-monitoring`

## 3. Background and Motivation
Currently, the system monitors students via webcam (visual). Sound detection is planned next. Adding screen sharing and monitoring will provide another layer of proctoring by observing the student's on-screen activity. This can help detect attempts to access unauthorized resources, use prohibited applications, or switch away from the active exam tab/window. This is crucial for maintaining exam integrity when students take exams on their own devices.

## 4. Key Challenges and Analysis
*(Expanded by Planner)*

-   **Screen Capture APIs & Permissions:**
    -   Challenge: `navigator.mediaDevices.getDisplayMedia()` is the standard API but requires explicit, one-time user permission for each session. It can capture a tab, window, or entire screen.
    -   Analysis: User experience for permission granting must be clear. The system needs to handle cases where permission is denied or the stream ends unexpectedly (e.g., user stops sharing).
-   **Scope of Monitoring & Privacy:**
    -   Challenge: Balancing effective monitoring with user privacy. Capturing the entire screen continuously can be intrusive and generate excessive data.
    -   Analysis:
        -   **Initial Focus (Phase 1):** Client-side detection of focus changes. The Page Visibility API (`document.hidden`, `visibilitychange` event) can detect if the current tab loses focus. For detecting switches to other applications (not just browser tabs), a more advanced approach might be needed, potentially involving periodic checks of active window titles if feasible through browser extensions (out of scope for initial pure web implementation).
        -   **Future Scope (Phase 2):** Periodic screenshots of the *entire screen* if focus is lost from the exam tab, or if specific suspicious keywords/applications are detected (requires OCR/application signature list). This has higher privacy implications and data handling costs.
        -   For Phase 1, we will primarily rely on the Page Visibility API and potentially `window.onblur` and `window.onfocus` events.
-   **Defining "Suspicious" Screen Activity (Phase 1 Focus):**
    -   Challenge: Accurately determining if a focus change is an attempt to cheat versus an innocuous event (e.g., system notification popup briefly taking focus).
    -   Analysis:
        -   Primary Event: Current tab (assumed to be the exam tab) loses focus (`document.hidden === true`).
        -   Secondary Event: Student navigates to a new URL within the monitored tab (if the exam is single-page app, this might not be relevant; if exam involves multiple pages on same domain, this is fine). `window.location.href` changes.
        -   Details to Log: Timestamp of focus loss, timestamp of focus return (if it happens), duration of focus loss. If possible, the URL navigated to if the focus change was within the browser to another tab.
-   **Client-Side vs. Server-Side Analysis:**
    -   Challenge: Deciding where the detection logic resides.
    -   Analysis: For Phase 1 (focus change detection), **client-side analysis is vastly preferable**. It's immediate, doesn't require transmitting screen content, and is less resource-intensive on the backend. Only event flags (e.g., "exam_tab_lost_focus") need to be sent.
-   **Cross-Browser Compatibility:**
    -   Challenge: Ensuring Page Visibility API and focus/blur events work consistently across target browsers.
    -   Analysis: Test thoroughly. `getDisplayMedia` is broadly supported, but its UI differs. Page Visibility API is well-supported.
-   **Minimizing False Positives:**
    -   Challenge: Short, unavoidable focus losses (e.g., system dialogs, accidental clicks outside).
    -   Analysis: Implement a short grace period (e.g., 2-3 seconds) before logging a "focus lost" event as critical. Log all focus losses but perhaps flag only those exceeding the grace period.

## 5. High-level Task Breakdown
*(Expanded by Planner)*

### Task 0: Setup Development Branch
*   **Sub-Task 0.1:** Create and switch to a new Git feature branch.
    *   Action: `git checkout main && git pull && git checkout -b feature/screen-monitoring`
    *   Success Criteria: New branch `feature/screen-monitoring` is created from the latest `main` and is active.

### Task 1: Research and Design (Client-Side Focus Detection)
*   **Sub-Task 1.1:** Research and prototype Page Visibility API usage.
    *   Action: Create a simple HTML/JS page that logs to console when tab visibility changes.
    *   Success Criteria: `document.hidden` status and `visibilitychange` events are correctly captured.
*   **Sub-Task 1.2:** Research `window.onblur` and `window.onfocus` events.
    *   Action: Test how these events behave when switching tabs, switching applications, or when browser dialogs appear.
    *   Success Criteria: Understanding of the reliability and granularity of these events for detecting focus loss from the exam window.
*   **Sub-Task 1.3:** Define specific screen events and parameters for Phase 1.
    *   Event Type 1: `exam_tab_unfocused` - Triggered when `document.hidden` becomes `true` or `window.onblur` fires for the exam tab.
    *   Event Type 2: `exam_tab_refocused` - Triggered when `document.hidden` becomes `false` or `window.onfocus` fires for the exam tab.
    *   Details: `duration_unfocused_seconds` (calculated when tab is refocused or session ends), `active_url_on_unfocus` (attempt to get `document.activeElement` or similar if possible, might be limited for security).
    *   Success Criteria: Clear definitions for client-side detectable screen events and their logging details.
*   **Sub-Task 1.4:** Design backend API endpoint (`/api/log-screen-event`).
    *   Action: Specify request format: JSON with `event_type` (e.g., `exam_tab_unfocused`), `details` (e.g., `timestamp`, `duration_unfocused_seconds`), `session_id`, `username`.
    *   Success Criteria: OpenAPI/Swagger-like definition for the new endpoint.

### Task 2: Frontend Implementation (Client-Side Detection & Event Transmission)
*   **Sub-Task 2.1:** Implement UI for initiating screen monitoring.
    *   Action: Add a button/toggle in `App.js` (e.g., "Enable Screen Monitoring") within the `Monitoring` tab. This might not require explicit `getDisplayMedia` for Phase 1 if only using Page Visibility / focus APIs, but it should inform the user that their tab activity is being monitored.
    *   Success Criteria: User is informed that screen activity (tab focus) will be monitored. State is managed in `App.js`.
*   **Sub-Task 2.2:** Implement Page Visibility and Focus/Blur event listeners.
    *   Action: In `App.js` (or a dedicated module), add event listeners for `visibilitychange`, `window.blur`, and `window.focus`.
    *   Success Criteria: Frontend can detect when the current tab loses or gains focus.
*   **Sub-Task 2.3:** Implement logic to identify and consolidate focus events.
    *   Action: Manage state to track when focus is lost and gained. Calculate duration of unfocused periods. Implement a short grace period (e.g., 3 seconds) before sending an `exam_tab_unfocused` event, but log the start time immediately.
    *   Success Criteria: Logic correctly identifies significant unfocused periods, ignoring very brief ones for critical flagging (though all can be logged).
*   **Sub-Task 2.4:** Send screen event flags to the backend.
    *   Action: When a defined screen event occurs (e.g., tab unfocused beyond grace period, tab refocused), send an event object to `/api/log-screen-event` via `axios.post`. Include `session_id` and JWT.
    *   Success Criteria: Backend receives screen event flags successfully.

### Task 3: Backend Implementation (Event Logging)
*   **Sub-Task 3.1:** Create `/api/log-screen-event` endpoint in `app.py`.
    *   Action: Implement the Flask route. Authenticate using `@jwt_required`. Parse incoming event data (`event_type`, `details`, `session_id`, `username`).
    *   Success Criteria: Endpoint is reachable and accepts event data.
*   **Sub-Task 3.2:** Log screen events to MongoDB.
    *   Action: Create an event object and insert it into the `proctoring_events` collection.
    *   Success Criteria: Screen-related events (`exam_tab_unfocused`, `exam_tab_refocused`) are correctly stored in MongoDB with appropriate details.

### Task 4: Frontend Implementation (Displaying Screen Events in Admin View)
*   **Sub-Task 4.1:** Update Event History table in `App.js`.
    *   Action: Modify the admin's "Event History" table to correctly parse and display new screen event types and their relevant details (e.g., duration unfocused).
    *   Success Criteria: Admin can see and understand screen-related events in the event log.

### Task 5: Testing and Refinement
*   **Sub-Task 5.1:** Test focus detection across browsers.
    *   Action: Verify on Chrome, Firefox. Test by switching tabs, minimizing window, switching applications.
    *   Success Criteria: Focus loss/gain detection works reliably. Grace period functions as expected.
*   **Sub-Task 5.2:** Full E2E testing.
    *   Action: User (as student) has screen monitoring active. Admin views event log. Test various scenarios of tab/application switching.
    *   Success Criteria: System works end-to-end. Screen events are logged and displayed correctly for admins.
*   **Sub-Task 5.3:** Evaluate false positives/negatives.
    *   Action: Assess if innocuous activities trigger events, or if actual cheating attempts are missed. Refine grace period or logic if needed.
    *   Success Criteria: Detection is reasonably accurate for Phase 1 scope.

### Task 6: Documentation and Merge
*   **Sub-Task 6.1:** Update `ai-proctor-docker/README.md`.
    *   Action: Document the new screen (tab focus) monitoring feature, any user indications, and how admins see the events.
    *   Success Criteria: README is updated.
*   **Sub-Task 6.2:** Update this implementation plan (`screen-monitoring.md`).
    *   Action: Fill in "Lessons Learned". Review and update any tasks/analyses based on actual implementation.
    *   Success Criteria: Plan reflects the final state of the feature.
*   **Sub-Task 6.3:** Merge `feature/screen-monitoring` to `main`.
    *   Action: Create PR, review, and merge.
    *   Success Criteria: Feature is integrated into `main`.

## 6. Project Status Board
*(To be filled by Executor)*

-   [ ] Task 0: Setup Development Branch
    -   [ ] Sub-Task 0.1: Create and switch to a new Git feature branch
-   [ ] Task 1: Research and Design (Client-Side Focus Detection)
    -   [ ] Sub-Task 1.1: Research and prototype Page Visibility API usage
    -   [ ] Sub-Task 1.2: Research `window.onblur` and `window.onfocus` events
    -   [ ] Sub-Task 1.3: Define specific screen events and parameters for Phase 1
    -   [ ] Sub-Task 1.4: Design backend API endpoint (`/api/log-screen-event`)
-   [ ] Task 2: Frontend Implementation (Client-Side Detection & Event Transmission)
    -   [ ] Sub-Task 2.1: Implement UI for initiating screen monitoring
    -   [ ] Sub-Task 2.2: Implement Page Visibility and Focus/Blur event listeners
    -   [ ] Sub-Task 2.3: Implement logic to identify and consolidate focus events
    -   [ ] Sub-Task 2.4: Send screen event flags to the backend
-   [ ] Task 3: Backend Implementation (Event Logging)
    -   [ ] Sub-Task 3.1: Create `/api/log-screen-event` endpoint in `app.py`
    -   [ ] Sub-Task 3.2: Log screen events to MongoDB
-   [ ] Task 4: Frontend Implementation (Displaying Screen Events in Admin View)
    -   [ ] Sub-Task 4.1: Update Event History table in `App.js`
-   [ ] Task 5: Testing and Refinement
    -   [ ] Sub-Task 5.1: Test focus detection across browsers
    -   [ ] Sub-Task 5.2: Full E2E testing
    -   [ ] Sub-Task 5.3: Evaluate false positives/negatives
-   [ ] Task 6: Documentation and Merge
    -   [ ] Sub-Task 6.1: Update `ai-proctor-docker/README.md`
    -   [ ] Sub-Task 6.2: Update this implementation plan (`screen-monitoring.md`)
    -   [ ] Sub-Task 6.3: Merge `feature/screen-monitoring` to `main`

## 7. Executor's Feedback or Assistance Requests
*(To be filled by Executor)*

## 8. Lessons Learned
*(To be documented as they arise)* 