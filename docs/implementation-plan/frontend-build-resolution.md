# Implementation Plan: Frontend Build Resolution

## 1. Background and Motivation

The frontend application (`ai-proctor-docker/frontend`) was experiencing persistent build and runtime errors. After a series of diagnostic and cleanup steps, the build errors related to `axios` and `process/browser` polyfills appear to be resolved, and the development server now starts.

However, new runtime errors have emerged in the browser console, primarily:
1.  **CORS error for `/api/analyze-audio`**: `Access to XMLHttpRequest at 'http://localhost:5000/api/analyze-audio' from origin 'http://localhost:3003' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
2.  **Face Capture Error**: `[Debug] captureAndAnalyze: imageSrc is null or empty.`
3.  **Missing `favicon.ico`**: `Failed to load resource: the server responded with a status of 404 (NOT FOUND)`
4.  **React Router Future Warnings**: Regarding `v7_startTransition` and `v7_relativeSplatPath`.
5.  **ScriptProcessorNode Deprecation**: `The ScriptProcessorNode is deprecated. Use AudioWorkletNode instead.`

This plan will now focus on addressing these runtime issues, prioritizing the CORS and face capture errors as they are critical for core functionality.

## 2. Key Challenges and Analysis

*   **CORS Configuration**: The backend (Flask) CORS setup needs to be re-verified to ensure it correctly handles preflight (OPTIONS) requests and sends the appropriate `Access-Control-Allow-Origin` headers for `http://localhost:3003`.
*   **Face Capture Logic**: The `captureAndAnalyze` function in `App.js` might have an issue in how it accesses the webcam image data, or the webcam component itself might not be initializing correctly.
*   **Minor Issues**: The favicon, React Router warnings, and ScriptProcessorNode deprecation are lower priority but should be addressed for completeness.

## 3. High-level Task Breakdown

**Phase 1: Critical Runtime Error Resolution (Executor)**

*   **Task 1.1: Verify Frontend Dev Server and Basic App Structure (DONE)**
    *   **Actions**:
        *   Kill any existing frontend processes.
        *   Perform a deep clean: `sudo rm -rf node_modules package-lock.json .webpack_cache`.
        *   Clear npm cache: `npm cache clean --force`.
        *   Simplify `config-overrides.js` to its most basic form (commenting out all polyfills and plugins initially).
        *   Reinstall dependencies: `npm install --legacy-peer-deps`.
        *   Attempt to start the dev server: `NODE_OPTIONS=--openssl-legacy-provider npm start` (or `PORT=3003 react-app-rewired start`).
    *   **Success Criteria**: Frontend development server starts without immediate compilation errors in the terminal. Browser loads the basic application structure (even if API calls fail).
    *   **Status**: COMPLETED. Frontend starts, but with runtime errors.

*   **Task 1.2: Diagnose and Fix Backend CORS for `/api/analyze-audio` (NEW)**
    *   **Actions**:
        *   Review Flask backend CORS configuration in `ai-proctor-docker/backend/app.py`.
        *   Ensure `Flask-CORS` is correctly initialized for `http://localhost:3003` and handles OPTIONS requests for `/api/analyze-audio`.
        *   Add detailed logging on the backend for incoming OPTIONS and POST requests to `/api/analyze-audio` to see headers and responses.
        *   Test with `curl` from the frontend container (if possible) or host machine to simulate preflight and actual requests.
    *   **Success Criteria**: Browser console no longer shows CORS errors when `/api/analyze-audio` is called. Backend logs confirm successful preflight and request handling.
    *   **Status**: NOT STARTED

*   **Task 1.3: Diagnose and Fix `imageSrc is null` for Face Capture (NEW)**
    *   **Actions**:
        *   Review `captureAndAnalyze` and related functions in `ai-proctor-docker/frontend/src/App.js`.
        *   Add more detailed console logging in the frontend to trace the state of `imageSrc` and the webcam component's data.
        *   Verify that the webcam component (`react-webcam`) is correctly mounted and permissions are granted in the browser.
    *   **Success Criteria**: `imageSrc` contains valid base64 image data when `captureAndAnalyze` is called. The `/api/analyze-face` endpoint receives image data (even if backend processing still has issues).
    *   **Status**: NOT STARTED

**Phase 2: Minor Issues and Refinements (Executor)**

*   **Task 2.1: Address `favicon.ico` 404 Error (NEW)**
    *   **Actions**: Add a `favicon.ico` to the `public` directory or fix the link in `public/index.html`.
    *   **Success Criteria**: No more 404 error for `favicon.ico` in the browser console.
    *   **Status**: NOT STARTED

*   **Task 2.2: Investigate and Address React Router Warnings (NEW)**
    *   **Actions**: Review React Router documentation regarding the future flags (`v7_startTransition`, `v7_relativeSplatPath`) and update the router configuration or code as needed.
    *   **Success Criteria**: React Router warnings are no longer present in the browser console.
    *   **Status**: NOT STARTED

*   **Task 2.3: Address ScriptProcessorNode Deprecation (NEW)**
    *   **Actions**: Research and implement `AudioWorkletNode` as a replacement for `ScriptProcessorNode` in `App.js` for audio processing.
    *   **Success Criteria**: `ScriptProcessorNode` deprecation warning is resolved, and audio processing continues to function correctly.
    *   **Status**: NOT STARTED

## 4. Current Status / Progress Tracking

*   [X] **Task 1.1**: Verify Frontend Dev Server and Basic App Structure
*   [ ] **Task 1.2**: Diagnose and Fix Backend CORS for `/api/analyze-audio`
*   [ ] **Task 1.3**: Diagnose and Fix `imageSrc is null` for Face Capture
*   [ ] **Task 2.1**: Address `favicon.ico` 404 Error
*   [ ] **Task 2.2**: Investigate and Address React Router Warnings
*   [ ] **Task 2.3**: Address ScriptProcessorNode Deprecation

## 5. Executor's Feedback or Assistance Requests

*   The frontend dev server is now starting, which is good progress.
*   The immediate next steps are to tackle the CORS issue with the `/api/analyze-audio` endpoint and the `imageSrc is null` problem for face analysis.

## 6. Branch Name

`fix/frontend-runtime-errors`

## 7. Lessons Learned (from this iteration)

*   Simplifying `config-overrides.js` and performing a full clean install was effective in resolving the initial set of complex build errors.
*   Persistent build errors often require stripping back configurations to a minimal state to isolate the problematic component.
*   [YYYY-MM-DD] Always ensure absolute paths are used with `read_file` if there's any ambiguity about the CWD, or if tool CWD context seems incorrect.
*   [YYYY-MM-DD] `npm audit fix --force` can be destructive and downgrade packages unexpectedly; use with caution and verify changes to `package.json` and `package-lock.json` immediately after.
*   [YYYY-MM-DD] Webpack polyfill issues for Node.js core modules like `process` and `buffer` in React 17+ / Webpack 5+ are common and require careful configuration in `config-overrides.js` (or direct webpack config) using `resolve.fallback` and often `ProvidePlugin`.
*   [YYYY-MM-DD] The error `BREAKING CHANGE: The request '...' failed to resolve only because it was resolved as fully specified` often means webpack is trying to resolve a module path like `process/browser` as if it were an exact file `process/browser` rather than looking for `process/browser.js` or similar. `resolve.alias` can sometimes help specify the exact file.

## Acceptance Criteria (Overall for this Plan)

1.  The frontend application loads in the browser without critical JavaScript errors in the console.
2.  The `/api/analyze-audio` endpoint can be successfully called from the frontend without CORS errors.
3.  The face capture mechanism correctly provides image data to the `/api/analyze-face` endpoint.
4.  Minor errors (favicon, React Router warnings, deprecated audio nodes) are addressed or have a documented plan for resolution. 