# Implementation Plan: User Authentication

## 1. Overview
This plan details the steps to implement user authentication for the AI Proctoring system. This will allow for tracking different users (students, administrators) and enable role-based access control to features and data.

## 2. Branch Name
`feature/user-authentication`

## 3. Background and Motivation
Currently, the AI Proctoring system operates without user-specific sessions or access controls. All users see the same interface and data (including detailed event logs). 
The key motivations for implementing user authentication are:
-   **User Tracking:** To associate proctoring sessions and events with specific student users.
-   **Access Control:** To restrict access to sensitive information (like detailed event logs and administrative functions) based on user roles (e.g., student vs. administrator/instructor). This addresses the concern that students should not see raw event logs in a production environment.
-   **Personalization:** To lay the groundwork for personalized experiences or settings if needed in the future.
-   **Security:** To provide a basic layer of security by requiring users to log in before accessing the system.

## 4. Key Challenges and Analysis
*(To be filled in as the planning and implementation progress)*

-   Choosing an appropriate and secure authentication strategy (e.g., session-based, JWT).
-   Securely storing user credentials.
-   Integrating authentication logic into the existing Flask backend and React frontend.
-   Designing a simple but effective role-based access control (RBAC) mechanism.
-   Ensuring a smooth user experience for login and registration.
-   Managing authenticated state across the application.

## 5. High-level Task Breakdown

### Task 0: Setup Development Branch
*   **Sub-Task 0.1:** Create and switch to a new Git feature branch.
    *   Action: `git checkout main && git pull && git checkout -b feature/user-authentication`
    *   Success Criteria: New branch `feature/user-authentication` is created from the latest `main` and is active.

### Task 1: Design Authentication Strategy and User Model
*   **Sub-Task 1.1:** Research and decide on an authentication mechanism.
    *   Options: Flask-Login (session-based), Flask-JWT-Extended (token-based).
    *   Considerations: Simplicity for this phase, security, scalability.
    *   Decision: **JWT (JSON Web Tokens) using `Flask-JWT-Extended` library.** This provides stateless authentication suitable for our API-driven architecture.
    *   Success Criteria: A clear authentication strategy is chosen and documented.
*   **Sub-Task 1.2:** Design the User model.
    *   Fields: 
        *   `username`: String, unique, required.
        *   `password_hash`: String, required.
        *   `role`: String, required (values: 'student', 'admin'), default: 'student'.
    *   Storage: MongoDB collection named `users`.
    *   Success Criteria: User model schema defined.
*   **Sub-Task 1.3:** Plan for password hashing.
    *   Action: Use `werkzeug.security.generate_password_hash` for creating password hashes and `werkzeug.security.check_password_hash` for verification.
    *   Success Criteria: Password hashing strategy documented.

### Task 2: Backend Implementation (Authentication API)
*   **Sub-Task 2.1:** Add User model and helper functions to `app.py` (or a new `models.py`).
    *   Action: Implement the User model (e.g., using PyMongo directly or a simple class). Add functions for creating users and verifying passwords.
    *   Success Criteria: User model and necessary DB interaction functions are implemented.
*   **Sub-Task 2.2:** Implement `/api/register` endpoint.
    *   Action: Create a POST endpoint for user registration. It should take username/password, hash the password, and store the new user.
    *   Success Criteria: Users can register via the API.
*   **Sub-Task 2.3:** Implement `/api/login` endpoint.
    *   Action: Create a POST endpoint for user login. It should take username/password, verify credentials, and return a token (if JWT) or set a session.
    *   Success Criteria: Users can log in and receive an auth token/session.
*   **Sub-Task 2.4:** Implement `/api/logout` endpoint (Decision: Client-side token removal only for this phase)
    *   Action: Create an endpoint to invalidate token/session.
    *   Success Criteria: Users can log out.
*   **Sub-Task 2.5:** Protect relevant existing endpoints.
    *   Action: Modify endpoints like `/api/analyze-face` and `/api/events` (for admin view) to require authentication.
    *   Success Criteria: Protected endpoints require valid authentication.

### Task 3: Frontend Implementation (Login UI and Auth Handling)
*   **Sub-Task 3.1:** Create Login/Registration UI components.
    *   Action: Develop React components for login and registration forms.
    *   Success Criteria: UI components for authentication are ready.
*   **Sub-Task 3.2:** Implement API calls for login/registration.
    *   Action: Write functions in `App.js` or a new auth service to call the backend auth endpoints.
    *   Success Criteria: Frontend can communicate with backend auth API.
*   **Sub-Task 3.3:** Manage authentication state (e.g., token, user info).
    *   Action: Use React Context or state management to store auth token and user details. Persist token (e.g., in `localStorage`).
    *   Success Criteria: Auth state is managed effectively in the frontend.
*   **Sub-Task 3.4:** Implement route protection / conditional rendering.
    *   Action: Redirect unauthenticated users from protected areas to login. Show/hide UI elements based on auth status and role.
    *   Success Criteria: UI adapts based on authentication and authorization.
*   **Sub-Task 3.5:** Modify Event History Tab Access.
    *   Action: Ensure only users with an 'admin' role can see the "Event History" tab. Student users should not see it.
    *   Success Criteria: Event History tab visibility is role-based.
*   **Sub-Task 3.6:** Rebuild and restart Docker containers

### Task 4: Testing and Refinement
*   **Sub-Task 4.1:** Backend API Testing.
    *   Action: Use tools like `curl` or Postman to test all auth-related API endpoints.
    *   Success Criteria: Backend API functions as expected.
*   **Sub-Task 4.2:** Frontend E2E Testing.
    *   Action: Manually test the full login, registration, logout flow. Test access to protected features and data based on roles.
    *   Success Criteria: Frontend authentication and authorization work correctly.
*   **Sub-Task 4.3:** User E2E Testing.
    *   Action: User to verify the entire authentication system.
    *   Success Criteria: User confirms the authentication system meets requirements.
*   **Sub-Task 4.4:** Enhance Event Logging with User Identity.
    *   Action: Modify backend to include `username` in event data. Modify frontend to display `username` in the Event History table for admins.
    *   Success Criteria: Admin event log clearly shows which user generated each event.

### Task 5: Documentation and Merge
*   **Sub-Task 5.1:** Update documentation.
    *   Action: Document new environment variables (if any), API endpoints, and user roles.
    *   Success Criteria: Documentation is updated.
*   **Sub-Task 5.2:** Merge `feature/user-authentication` to `main`.
    *   Action: Create PR, review, and merge.
    *   Success Criteria: Feature is integrated into `main`.

## 6. Project Status Board
*(To be filled by Executor)*

-   [x] Task 0: Setup Development Branch
    -   [x] Sub-Task 0.1: Create and switch to a new Git feature branch
-   [x] Task 1: Design Authentication Strategy and User Model
    -   [x] Sub-Task 1.1: Research and decide on an authentication mechanism (Decision: JWT with Flask-JWT-Extended)
    -   [x] Sub-Task 1.2: Design the User model (Schema defined for MongoDB)
    -   [x] Sub-Task 1.3: Plan for password hashing (Decision: werkzeug.security)
-   [x] Task 2: Backend Implementation (Authentication API)
    -   [x] Sub-Task 2.1: Add User model and helper functions to `app.py` (or a new `models.py`)
    -   [x] Sub-Task 2.2: Implement `/api/register` endpoint
    -   [x] Sub-Task 2.3: Implement `/api/login` endpoint
    -   [x] Sub-Task 2.4: Implement `/api/logout` endpoint (Decision: Client-side token removal only for this phase)
    -   [x] Sub-Task 2.5: Protect relevant existing endpoints
-   [x] Task 3: Frontend Implementation (Login UI and Auth Handling)
    -   [x] Sub-Task 3.1: Create Login/Registration UI components
    -   [x] Sub-Task 3.2: Implement API calls for login/registration
    -   [x] Sub-Task 3.3: Manage authentication state (e.g., token, user info)
    -   [x] Sub-Task 3.4: Implement route protection / conditional rendering
    -   [x] Sub-Task 3.5: Modify Event History Tab Access
    -   [x] Sub-Task 3.6: Rebuild and restart Docker containers
-   [x] Task 4: Testing and Refinement
    -   [x] Sub-Task 4.1: Backend API Testing.
    -   [x] Sub-Task 4.2: Frontend E2E Testing.
    -   [x] Sub-Task 4.3: User E2E Testing.
    -   [x] Sub-Task 4.4: Enhance Event Logging with User Identity.
-   [x] Task 5: Documentation and Merge
    -   [x] Sub-Task 5.1: Update documentation.
    -   [x] Sub-Task 5.2: Merge `feature/user-authentication` to `main`.

## 7. Executor's Feedback or Assistance Requests
*(To be filled by Executor)*
+ Sub-Task 0.1: Development branch `feature/user-authentication` created and initial planning documents committed.
+ Task 1: Design phase complete. Authentication strategy (JWT with Flask-JWT-Extended), User Model (username, password_hash, role in MongoDB 'users' collection), and password hashing (werkzeug.security) have been decided and documented in this plan.
+ Sub-Task 2.1: Initial backend setup for authentication complete. Added `Flask-JWT-Extended` and `Werkzeug` to requirements. Configured JWT in `app.py` and defined `users_collection`.
+ Sub-Task 2.2: `/api/auth/register` endpoint implemented in `app.py`. Handles new user registration, password hashing, and storage in MongoDB.
+ Sub-Task 2.3: `/api/auth/login` endpoint implemented in `app.py`. Handles credential verification and JWT generation, including user role in token claims and response.
+ Sub-Task 2.4: Logout will be handled client-side by discarding the JWT. No backend `/api/logout` endpoint with token blocklisting will be implemented in this phase to maintain simplicity. Server-side logout can be a future enhancement if robust token invalidation is required.
+ Sub-Task 2.5: Protected `/api/analyze-face` (JWT required) and `/api/events` (JWT required + admin role) endpoints in `app.py`.
+ Sub-Task 3.1: Basic Login/Registration forms and conditional rendering logic added to `App.js`. Includes state for auth form inputs and a Navbar for logged-in users.
+ Sub-Task 3.2: Implemented API calls for login and registration in `App.js`. Includes storing/removing token and user info in `localStorage` and updating React state on success/failure.
+ Sub-Task 3.3: Added `useEffect` hooks to `App.js` to load stored auth state from `localStorage` on app start and to set up an Axios interceptor for automatically attaching JWT to requests.
+ Sub-Task 3.4: Conditional rendering in `App.js` (displaying auth forms or main app based on `currentUser` state) effectively protects the main application UI. API calls are protected by backend JWT checks via the Axios interceptor.
+ Sub-Task 3.5: Event History tab in `App.js` is now conditionally rendered based on `currentUser.role === 'admin'`.
+ Sub-Task 3.6: Docker containers rebuilt and restarted to apply all authentication feature changes.
+ Sub-Task 4.1: Backend API endpoints (register, login, protected routes) are implemented. Full verification will occur during frontend E2E testing (Sub-Task 4.2) and User E2E testing (Sub-Task 4.3).
+ **BLOCKER RESOLVED (Task 4.2):** Encountered persistent `ModuleNotFoundError: No module named 'flask_jwt_extended'` in the backend container, even after multiple rebuilds (`--no-cache`, `down --rmi all -v`).
    + **Root Cause Analysis:** The exact reason why `pip install -r requirements.txt` did not reliably install `Flask-JWT-Extended` is unclear, but it seemed to fail silently for this specific package within the Docker build.
    + **Solution:** Modified `ai-proctor-docker/backend/Dockerfile` to include an explicit `RUN pip install --no-cache-dir Flask-JWT-Extended` command *after* the general `RUN pip install --no-cache-dir -r requirements.txt` command. This forced the installation and resolved the module loading issue. Backend now starts correctly.
+ **Sub-Task 4.1 & 4.2 Completed:** Backend API testing and Frontend E2E testing are now complete. All core authentication and authorization functionalities (registration, login, logout, role-based UI for Event History, protected API access for proctoring and event logs) have been verified for both 'student' and 'admin' roles. The core proctoring functionality remains operational for both user types.
+ **Sub-Task 4.3 Completed (with feedback):** User E2E testing confirmed overall system functionality. Key feedback: Admin event logs lack user distinction, making it hard to correlate events/sessions to specific users. This was addressed in Sub-Task 4.4.
+ **Sub-Task 4.4 Completed:** Event logging enhanced. Backend now stores `username` with each event. Frontend admin view displays "All Event Logs" (not filtered by admin's session), includes a "User" column, a "Session ID" column, and formats the "Details" column for better readability. This successfully addresses the feedback from Sub-Task 4.3.
+ **Sub-Task 5.1 Completed:** Created `ai-proctor-docker/README.md` documenting the services, environment variables (especially `FLASK_JWT_SECRET_KEY` and `MONGO_URI`), API endpoints (authentication, proctoring, events), user roles, and basic run instructions.
+ **Sub-Task 5.2 Completed:** Feature branch `feature/user-authentication` merged to `main` via PR #2. Local and remote feature branches deleted.

## 8. Lessons Learned
*(To be documented as they arise)*
+ [2025-05-25] If a Python package specified in `requirements.txt` consistently fails to import in a Docker container (`ModuleNotFoundError`) despite clean rebuilds (`--no-cache`, `down --rmi all -v`) and no errors during the `pip install -r requirements.txt` step in the Docker build log, try adding a separate, explicit `RUN pip install --no-cache-dir <package_name>` for that specific package in the Dockerfile. This can sometimes force the installation or provide more specific error messages. 