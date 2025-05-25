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

## 5. High-level Task Breakdown
*(Expanded by Planner)*

### Task 0: Setup Development Branch
*   **Sub-Task 0.1:** Create and switch to a new Git feature branch.
    *   Action: `git checkout main && git pull && git checkout -b feature/sound-detection`
    *   Success Criteria: New branch `feature/sound-detection` is created from the latest `main` and is active.

### Task 1: Research and Design Deep Dive
*   **Sub-Task 1.1:** Finalize browser API for microphone access.
    *   Action: Confirm `navigator.mediaDevices.getUserMedia` is suitable. Prototype basic audio capture in `App.js`.
    *   Success Criteria: Able to capture raw audio stream in the frontend. UI button to start/stop capture for testing.
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
*   **Sub-Task 4.1:** Update Event History table in `App.js`.
    *   Action: Modify the admin's "Event History" table to correctly parse and display new sound event types (`speech_detected`, `loud_noise_detected`) and their relevant details from the `event.details` object.
    *   Success Criteria: Admin can see and understand sound-related events in the event log.

### Task 5: Testing and Refinement
*   **Sub-Task 5.1:** Test microphone access and audio capture.
    *   Action: Verify on Chrome, Firefox. Test with different microphones. Test permission denial scenarios.
    *   Success Criteria: Audio capture works reliably. UI handles permissions correctly.
*   **Sub-Task 5.2:** Test backend audio analysis accuracy.
    *   Action: Send various test audio files/streams (speech, silence, background noise, sudden loud sounds) to the backend endpoint directly (e.g., via script/Postman) and verify event generation.
    *   Success Criteria: Backend correctly identifies defined sound events.
*   **Sub-Task 5.3:** Full E2E testing.
    *   Action: User (as student) enables sound monitoring. Admin views event log. Test various scenarios (talking, loud noises, silence).
    *   Success Criteria: System works end-to-end. Events are logged and displayed correctly.
*   **Sub-Task 5.4:** Refine detection thresholds.
    *   Action: Based on E2E testing, adjust VAD sensitivity, speech duration, and noise level thresholds to optimize for accuracy and minimize false positives. This may be iterative.
    *   Success Criteria: System achieves a good balance between detecting genuine events and ignoring innocuous sounds.

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

## 6. Project Status Board
*(To be filled by Executor)*

-   [ ] Task 0: Setup Development Branch
    -   [ ] Sub-Task 0.1: Create and switch to a new Git feature branch
-   [ ] Task 1: Research and Design Deep Dive
    -   [ ] Sub-Task 1.1: Finalize browser API for microphone access
    -   [ ] Sub-Task 1.2: Select backend audio processing libraries
    -   [ ] Sub-Task 1.3: Define specific sound event types and parameters
    -   [ ] Sub-Task 1.4: Finalize data transmission strategy (Chunked POST)
    -   [ ] Sub-Task 1.5: Design backend API endpoint (`/api/analyze-audio`)
-   [ ] Task 2: Frontend Implementation (Audio Capture & Transmission)
    -   [ ] Sub-Task 2.1: Implement microphone access UI and logic
    -   [ ] Sub-Task 2.2: Implement audio chunking and formatting
    -   [ ] Sub-Task 2.3: Implement sending audio chunks to backend
    -   [ ] Sub-Task 2.4 (Optional - Phase 1 Defer): Client-side VAD
-   [ ] Task 3: Backend Implementation (Audio Analysis & Event Logging)
    -   [ ] Sub-Task 3.1: Create `/api/analyze-audio` endpoint in `app.py`
    -   [ ] Sub-Task 3.2: Implement VAD for speech detection
    -   [ ] Sub-Task 3.3: Implement RMS analysis for loud noise detection
    -   [ ] Sub-Task 3.4: Log detected sound events to MongoDB
    -   [ ] Sub-Task 3.5: Add new sound event types to requirements.txt
-   [ ] Task 4: Frontend Implementation (Displaying Sound Events in Admin View)
    -   [ ] Sub-Task 4.1: Update Event History table in `App.js`
-   [ ] Task 5: Testing and Refinement
    -   [ ] Sub-Task 5.1: Test microphone access and audio capture
    -   [ ] Sub-Task 5.2: Test backend audio analysis accuracy
    -   [ ] Sub-Task 5.3: Full E2E testing
    -   [ ] Sub-Task 5.4: Refine detection thresholds
-   [ ] Task 6: Documentation and Merge
    -   [ ] Sub-Task 6.1: Update `ai-proctor-docker/README.md`
    -   [ ] Sub-Task 6.2: Update this implementation plan (`sound-detection.md`)
    -   [ ] Sub-Task 6.3: Merge `feature/sound-detection` to `main`

## 7. Executor's Feedback or Assistance Requests
*(To be filled by Executor)*

## 8. Lessons Learned
*(To be documented as they arise)* 