# -*- coding: utf-8 -*-
"""
Created on Thu Jul 30 19:21:18 2020

@author: hp
"""

import cv2
import numpy as np
from face_detector import get_face_detector, find_faces
from face_landmarks import get_landmark_model, detect_marks

def eye_on_mask(mask, side, shape):
    """
    Create ROI on mask of the size of eyes and also find the extreme points of each eye

    Parameters
    ----------
    mask : np.uint8
        Blank mask to draw eyes on
    side : list of int
        the facial landmark numbers of eyes
    shape : Array of uint32
        Facial landmarks

    Returns
    -------
    mask : np.uint8
        Mask with region of interest drawn
    [l, t, r, b] : list
        left, top, right, and bottommost points of ROI

    """
    points = [shape[i] for i in side]
    points = np.array(points, dtype=np.int32)
    mask = cv2.fillConvexPoly(mask, points, 255)
    l = points[0][0]
    t = (points[1][1]+points[2][1])//2
    r = points[3][0]
    b = (points[4][1]+points[5][1])//2
    return mask, [l, t, r, b]

def find_eyeball_position(end_points, cx, cy):
    """Find and return the eyeball positions, i.e. left or right or top or normal"""
    x_ratio = (end_points[0] - cx)/(cx - end_points[2])
    y_ratio = (cy - end_points[1])/(end_points[3] - cy)
    if x_ratio > 3:
        return 1
    elif x_ratio < 0.33:
        return 2
    elif y_ratio < 0.33:
        return 3
    else:
        return 0

    
def contouring(thresh, mid, img, end_points, right=False):
    """
    Find the largest contour on an image divided by a midpoint and subsequently the eye position

    Parameters
    ----------
    thresh : Array of uint8
        Thresholded image of one side containing the eyeball
    mid : int
        The mid point between the eyes
    img : Array of uint8
        Original Image
    end_points : list
        List containing the exteme points of eye
    right : boolean, optional
        Whether calculating for right eye or left eye. The default is False.

    Returns
    -------
    pos: int
        the position where eyeball is:
            0 for normal
            1 for left
            2 for right
            3 for up

    """
    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    try:
        cnt = max(cnts, key = cv2.contourArea)
        M = cv2.moments(cnt)
        cx = int(M['m10']/M['m00'])
        cy = int(M['m01']/M['m00'])
        if right:
            cx += mid
        cv2.circle(img, (cx, cy), 4, (0, 0, 255), 2)
        pos = find_eyeball_position(end_points, cx, cy)
        return pos
    except:
        pass
    
def process_thresh(thresh):
    """
    Preprocessing the thresholded image

    Parameters
    ----------
    thresh : Array of uint8
        Thresholded image to preprocess

    Returns
    -------
    thresh : Array of uint8
        Processed thresholded image

    """
    thresh = cv2.erode(thresh, None, iterations=2) 
    thresh = cv2.dilate(thresh, None, iterations=4) 
    thresh = cv2.medianBlur(thresh, 3) 
    thresh = cv2.bitwise_not(thresh)
    return thresh

def print_eye_pos(img, left, right):
    """
    Print the side where eye is looking and display on image

    Parameters
    ----------
    img : Array of uint8
        Image to display on
    left : int
        Position obtained of left eye.
    right : int
        Position obtained of right eye.

    Returns
    -------
    None.

    """
    if left == right and left != 0:
        text = ''
        if left == 1:
            print('Looking left')
            text = 'Looking left'
        elif left == 2:
            print('Looking right')
            text = 'Looking right'
        elif left == 3:
            print('Looking up')
            text = 'Looking up'
        font = cv2.FONT_HERSHEY_SIMPLEX 
        cv2.putText(img, text, (30, 30), font,  
                   1, (0, 255, 255), 2, cv2.LINE_AA) 

face_model = get_face_detector()
landmark_model = get_landmark_model()
left = [36, 37, 38, 39, 40, 41]
right = [42, 43, 44, 45, 46, 47]

# cv2.namedWindow("image") # Commented out to prevent GUI errors in headless environment
kernel = np.ones((9, 9), np.uint8)

def nothing(x):
    pass

# cv2.createTrackbar("threshold", "image", 75, 255, nothing) # Commented out

# ---- START OF USER PROVIDED CODE ----
def eye_aspect_ratio(eye):
    # Compute the euclidean distances between the vertical eye landmarks
    A = np.linalg.norm(eye[1] - eye[5])
    B = np.linalg.norm(eye[2] - eye[4])
    # Compute the euclidean distance between the horizontal eye landmarks
    C = np.linalg.norm(eye[0] - eye[3])
    # Compute the eye aspect ratio
    ear = (A + B) / (2.0 * C)
    return ear

def calculate_horizontal_gaze(eye):
    # Calculate the position of the pupil relative to the eye corners
    # Ensure eye points are integers for indexing if they come from landmarks directly
    eye = np.array(eye, dtype=np.int32) 
    eye_width = np.linalg.norm(eye[0] - eye[3])
    if eye_width == 0:
        return 0
    # Assuming pupil center can be approximated by averaging specific landmark points
    # The user's code implies eye[1], eye[2], eye[4], eye[5] are relevant for pupil.
    # These points are [37, 38, 40, 41] for left eye and [43, 44, 46, 47] for right eye if 'eye' is one of these sets.
    pupil_center = (eye[1] + eye[2] + eye[4] + eye[5]) / 4.0
    eye_center = (eye[0] + eye[3]) / 2.0
    gaze_ratio = (pupil_center[0] - eye_center[0]) / eye_width
    return gaze_ratio

def calculate_vertical_gaze(eye):
    """
    Calculate vertical gaze direction - Simplified attempt for better centering around 0.
    Assumes 'eye' is a 6-element array of [x,y] coordinates for one eye.
    Landmarks: 0=corner, 1=top, 2=top, 3=corner, 4=bottom, 5=bottom (approx)
    e.g., marks[36:42] for left eye: [36, 37, 38, 39, 40, 41]
    """
    eye = np.array(eye, dtype=np.float32)

    # Vertical distance between landmark 1 (e.g. 37) and 4 (e.g. 40)
    # These are generally the highest and lowest points of the 6 landmarks for an eye.
    eye_height = np.linalg.norm(eye[1] - eye[4]) 
    if eye_height == 0:
        return 0
        
    # Approximate pupil y-coordinate using average of y-coords of points 1,2,4,5
    # (Relative to the eye landmark indices: eye[1], eye[2], eye[4], eye[5])
    pupil_y_approx = (eye[1][1] + eye[2][1] + eye[4][1] + eye[5][1]) / 4.0
    
    # Approximate eye center y-coordinate using average of y-coords of points 1 and 4
    eye_center_y_approx = (eye[1][1] + eye[4][1]) / 2.0
    
    gaze_ratio = ((pupil_y_approx - eye_center_y_approx) / eye_height) * 3.0
    
    return gaze_ratio

def get_eye_status(marks, face_region=None):
    """
    Analyze eye landmarks to determine gaze direction
    Returns: "forward", "left", "right", or "up" based on eye position
    """
    # Extract eye landmarks for left and right eyes
    # landmarks 36-41 are left eye, 42-47 are right eye
    left_eye_pts = marks[36:42].astype(np.float32) # Use float for calculations
    right_eye_pts = marks[42:48].astype(np.float32)
    
    # Calculate horizontal gaze ratio for both eyes
    # The helper functions expect a 6-point eye model
    left_gaze = calculate_horizontal_gaze(left_eye_pts)
    right_gaze = calculate_horizontal_gaze(right_eye_pts)
    
    # Calculate vertical gaze ratio for both eyes
    left_vertical = calculate_vertical_gaze(left_eye_pts)
    right_vertical = calculate_vertical_gaze(right_eye_pts)
    
    # Thresholds based on observed values
    horizontal_threshold = 0.035  # Increased sensitivity (was 0.05)
    vertical_threshold = 0.075     # Slightly increased sensitivity for UP (was 0.08), multiplier in calc_vertical_gaze is 3.0
    
    # Log calculated gaze values for debugging
    print(f"[DEBUG] Gaze Values: L_H: {left_gaze:.4f}, R_H: {right_gaze:.4f}, L_V: {left_vertical:.4f}, R_V: {right_vertical:.4f}, H_Thresh: {horizontal_threshold}, V_Thresh: {vertical_threshold}", flush=True)

    # Determine gaze direction
    # Consider if both eyes need to agree or if one is dominant
    # Changing to OR logic: if EITHER eye meets the criteria.
    # Swapped left/right logic based on user feedback (camera view vs user view)
    # Added explicit "down" check and prioritized vertical checks.
    if left_vertical < -vertical_threshold or right_vertical < -vertical_threshold:
        return "up"
    elif left_vertical > vertical_threshold or right_vertical > vertical_threshold: # DOWN
        return "down"
    elif left_gaze > horizontal_threshold or right_gaze > horizontal_threshold: # Pupil moved to camera's right (user's LEFT)
        return "left" 
    elif left_gaze < -horizontal_threshold or right_gaze < -horizontal_threshold: # Pupil moved to camera's left (user's RIGHT)
        return "right"
    else:
        return "forward"

# ---- END OF USER PROVIDED CODE ----

#The existing get_eye_status function (approximately from line 178 to 309 in the previous file view) is replaced by the code above.
#The following is the old track_eye function, which should remain if it's used elsewhere or for reference,
#but it's not directly called by app.py anymore for the primary eye status.
#If it's not used, it could be removed to clean up. For now, keeping it.

def track_eye(video_path=None):

    video_path = ""

    cap = cv2.VideoCapture(video_path)
    ret, img = cap.read()
    thresh = img.copy()

    while(True):
        ret, img = cap.read()
        rects = find_faces(img, face_model)

        if not ret:
            break
        
        for rect in rects:
            shape = detect_marks(img, landmark_model, rect)
            mask = np.zeros(img.shape[:2], dtype=np.uint8)
            mask, end_points_left = eye_on_mask(mask, left, shape)
            mask, end_points_right = eye_on_mask(mask, right, shape)
            mask = cv2.dilate(mask, kernel, 5)
            
            eyes = cv2.bitwise_and(img, img, mask=mask)
            mask = (eyes == [0, 0, 0]).all(axis=2)
            eyes[mask] = [255, 255, 255]
            mid = int((shape[42][0] + shape[39][0]) // 2)
            eyes_gray = cv2.cvtColor(eyes, cv2.COLOR_BGR2GRAY)
            threshold = cv2.getTrackbarPos('threshold', 'image')
            _, thresh = cv2.threshold(eyes_gray, threshold, 255, cv2.THRESH_BINARY)
            thresh = process_thresh(thresh)
            
            eyeball_pos_left = contouring(thresh[:, 0:mid], mid, img, end_points_left)
            eyeball_pos_right = contouring(thresh[:, mid:], mid, img, end_points_right, True)
            print_eye_pos(img, eyeball_pos_left, eyeball_pos_right)
            # for (x, y) in shape[36:48]:
            #     cv2.circle(img, (x, y), 2, (255, 0, 0), -1)
            
        cv2.imshow('eyes', img)
        cv2.imshow("image", thresh)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        
    cap.release()
    cv2.destroyAllWindows()
