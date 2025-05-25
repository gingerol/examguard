# Summary of Eye-Tracking Sensitivity Findings

Date: 2025-05-25

## 1. Initial Problem
The eye-tracking feature in the AI Proctoring system was reported by the user to have low sensitivity, requiring substantial head movement to trigger "looking away" events.

## 2. Iteration History and Observations

We have gone through several iterations attempting to improve the sensitivity, primarily by adjusting thresholds in the `get_eye_status` function within `ai-proctor-docker/backend/eye_tracker.py`. This function uses helper functions (`calculate_horizontal_gaze`, `calculate_vertical_gaze`) to determine gaze ratios based on facial landmarks.

### Iteration 1: User-Provided Code and Initial Thresholds
-   **Change:** Implemented new `get_eye_status` logic and helper functions based on user-provided code.
-   **Thresholds Set:** `horizontal_threshold = 0.35`, `vertical_threshold = 0.3`.
-   **User Feedback:** System was still not sensitive enough, possibly even less sensitive than before.

### Iteration 2: Reduced Thresholds (Attempt 1)
-   **Change:** Reduced thresholds further.
-   **Thresholds Set:** `horizontal_threshold = 0.2`, `vertical_threshold = 0.2`.
-   **User Feedback:** System perceived as even less sensitive.

### Iteration 3: Added Debug Logging
-   **Change:** Added `print()` statements in `eye_tracker.py` to log the raw calculated gaze ratios (L_H, R_H, L_V, R_V) and the current thresholds before the direction determination logic.
-   **Thresholds Kept:** `horizontal_threshold = 0.2`, `vertical_threshold = 0.2`.
-   **Log Analysis & Observations:**
    -   The raw calculated gaze ratio values (e.g., `L_H: -0.0124`, `R_H: 0.0236`) were consistently very small in magnitude, generally less than `0.1`.
    -   These small values were not exceeding the `0.2` thresholds, explaining the lack of sensitivity.

### Iteration 4: Drastically Reduced Thresholds (Attempt 2)
-   **Change:** Based on log analysis, thresholds were significantly reduced.
-   **Thresholds Set:** `horizontal_threshold = 0.07`, `vertical_threshold = 0.07` (debug logging remained active).
-   **Log Analysis & Observations (from user-provided logs like `[DEBUG] Gaze Values: L_H: 0.0345, R_H: 0.0795, L_V: -0.0184, R_V: -0.0219, H_Thresh: 0.07, V_Thresh: 0.07`):
    -   The system was still generally not triggering "looking away" events frequently enough.
    -   **Key Finding:** In at least one instance, a single eye's horizontal gaze ratio (`R_H: 0.0795`) did exceed the new `0.07` threshold. However, the corresponding other eye's ratio (`L_H: 0.0345`) did not.
    -   The current logic in `get_eye_status` for determining gaze direction (e.g., "left", "right", "up") uses an **AND** condition, meaning *both* eyes' gaze ratios must individually exceed the threshold (e.g., `left_gaze > horizontal_threshold AND right_gaze > horizontal_threshold`). This prevented the single eye's significant gaze from triggering a directional status change.
    -   Vertical gaze ratio values (L_V, R_V) consistently remained very small, much smaller than the horizontal ratios and the `0.07` threshold.

## 3. Current Hypotheses and Potential Next Steps (Paused)

-   **Strict Eye Agreement Logic:** The requirement for *both* eyes to agree (AND logic) before flagging a gaze direction appears to be a primary factor in the continued low sensitivity, especially when one eye might be more clearly indicating a direction than the other.
    -   *Proposed Next Step (Paused):* Modify the logic to use an **OR** condition, where if *either* eye's gaze ratio exceeds the threshold, the corresponding direction is triggered.
-   **Vertical Gaze Insensitivity:** The vertical gaze detection is particularly ineffective. The calculated vertical gaze ratios are extremely small. This might be due to:
    -   The approximation used in `calculate_vertical_gaze` for pupil and eye center estimation relative to vertical eye height.
    -   The specific facial landmark points used for calculating vertical eye height might not be optimal.
-   **Threshold Finetuning:** Even with an OR logic, the `0.07` thresholds might still need further adjustment (either slightly up or down) depending on real-world testing with the new logic.

## 4. Other Observations
-   When the user's face moves out of the camera frame, the frontend correctly switches to "Offline mode." This is likely because the backend API returns an error (e.g., "No face detected"), which the frontend handles by assuming a connection issue or inability to process.

This summary reflects the state of investigation as of the date above. Further debugging and experimentation would be needed to achieve the desired sensitivity. 