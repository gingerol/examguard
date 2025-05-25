# AI Proctoring System - Docker Services

This directory contains the Dockerized backend and frontend services for the AI Proctoring System.

## Overview

The system consists of three main services managed by Docker Compose:

1.  **`backend`**: A Flask (Python) application that handles:
    *   User authentication (registration, login).
    *   Face detection and eye-tracking analysis from webcam images.
    *   Event logging to MongoDB.
    *   Serving API endpoints for the frontend.
2.  **`frontend`**: A React (JavaScript) application that provides the user interface for:
    *   User login and registration.
    *   Displaying the webcam feed for proctoring.
    *   Showing real-time proctoring status and alerts.
    *   Displaying event history for administrators.
3.  **`mongodb`**: A MongoDB database instance used to store:
    *   User credentials (`users` collection).
    *   Proctoring event logs (`proctoring_events` collection).

## Environment Variables

The following environment variables are used by the services. These can be set in a `.env` file in this directory ( `ai-proctor-docker/.env` ) or directly in your environment.

### Backend (`backend` service)

*   **`MONGO_URI`**:
    *   Description: The connection string for the MongoDB database.
    *   Default (in `app.py` if not set, intended for Docker Compose): `mongodb://mongodb:27017/`
    *   Example for external MongoDB: `mongodb://your_mongo_user:your_mongo_password@your_mongo_host:27017/proctoring_db`
*   **`FLASK_JWT_SECRET_KEY`**:
    *   Description: A secret key used to sign JWTs (JSON Web Tokens) for user authentication. **This is critical for security.**
    *   Default (in `app.py`): `'super-secret-dev-key'` (This is **NOT secure** and **MUST be changed for any production or sensitive environment**).
    *   Recommendation: Generate a strong, random string (e.g., using `openssl rand -hex 32`).
    *   Example: `FLASK_JWT_SECRET_KEY=your_strong_random_secret_key_here`

## API Endpoints (Backend)

All API endpoints are served from the `backend` service, typically running on port `5000`.

### Authentication

*   **`POST /api/auth/register`**:
    *   Description: Registers a new user.
    *   Request Body (JSON):
        ```json
        {
          "username": "your_username",
          "password": "your_password",
          "role": "student" // Optional, defaults to "student". Can be "admin".
        }
        ```
    *   Responses:
        *   `201 Created`: User created successfully.
        *   `400 Bad Request`: Missing username or password.
        *   `409 Conflict`: Username already exists.
*   **`POST /api/auth/login`**:
    *   Description: Logs in an existing user.
    *   Request Body (JSON):
        ```json
        {
          "username": "your_username",
          "password": "your_password"
        }
        ```
    *   Responses:
        *   `200 OK`: Login successful. Returns `access_token`, `username`, and `role`.
            ```json
            {
              "access_token": "your_jwt_token",
              "username": "your_username",
              "role": "student_or_admin"
            }
            ```
        *   `400 Bad Request`: Missing username or password.
        *   `401 Unauthorized`: Bad username or password.

### Proctoring and Events

*   **`POST /api/analyze-face`**:
    *   Description: Analyzes a webcam image for face detection and eye tracking. Logs proctoring events.
    *   Authentication: **Required (JWT)**.
    *   Request: `FormData` containing an `image` (file) and `session_id` (string).
    *   Response (JSON):
        ```json
        {
          "face_detected": true,
          "eye_status": "forward" // e.g., "forward", "left", "right", "up", "down"
          "looking_away": false, // boolean
          "warning_multiple_faces": "Optional warning string if multiple faces detected"
        }
        ```
        Or an error object if no face is detected or image is missing.
    *   Event Logging: Logs events like `no_face_detected`, `multiple_faces_detected`, `face_analyzed` to MongoDB, now including the `username` of the authenticated user.
*   **`GET /api/events`**:
    *   Description: Retrieves proctoring event logs.
    *   Authentication: **Required (JWT) AND User Role: `admin`**.
    *   Query Parameters:
        *   `session_id` (optional): Filter events by a specific session ID. If omitted, returns events from all sessions (admin view).
        *   `limit` (optional): Maximum number of events to return (default: 50).
    *   Response (JSON): An array of event objects. Each event object now includes `username` and `session_id`.
        ```json
        [
          {
            "_id": "object_id_string",
            "timestamp": "iso_timestamp_string",
            "username": "user_who_generated_event",
            "session_id": "session_id_of_event",
            "event_type": "face_analyzed",
            "details": { ... }
          },
          ...
        ]
        ```
*   **`GET /api/health`**:
    *   Description: A simple health check endpoint.
    *   Authentication: Not required.
    *   Response (JSON): `{"status": "ok", "message": "AI Proctoring system is running"}`

## User Roles

Two user roles are currently defined:

1.  **`student`**:
    *   Can register and log in.
    *   Can use the proctoring ("Monitoring") functionality, which sends images for analysis.
    *   Events generated by their sessions are logged with their username.
    *   Cannot access the "Event History" tab or the `/api/events` endpoint directly.
2.  **`admin`**:
    *   Can be created by providing `"role": "admin"` during registration (typically done manually via API call for initial admin setup).
    *   Can log in.
    *   Can use the proctoring ("Monitoring") functionality.
    *   Can access the "Event History" tab, which displays a consolidated view of events from all users and sessions.
    *   Can directly query the `/api/events` endpoint.

## Running the System

1.  Ensure Docker and Docker Compose are installed.
2.  Create a `.env` file in the `ai-proctor-docker` directory if you need to override default environment variables (especially `FLASK_JWT_SECRET_KEY` for security).
3.  From the `ai-proctor-docker` directory, run:
    ```bash
    docker compose up --build -d
    ```
4.  The frontend will be accessible at `http://localhost:3000`.
5.  The backend API will be accessible at `http://localhost:5000`.

To stop the system:
```bash
docker compose down
``` 