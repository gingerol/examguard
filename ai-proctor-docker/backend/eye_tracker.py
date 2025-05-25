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

def get_eye_status(img, shape, threshold_val=75):
    """
    Determines the eye status (looking direction) based on facial landmarks and an image.
    This function is designed to be called by the backend API.

    Parameters
    ----------
    img : np.uint8
        The image containing the face.
    shape : Array of uint32
        Facial landmarks (equivalent to 'marks' in app.py).
    threshold_val : int, optional
        Threshold value for image processing. Default is 75.

    Returns
    -------
    status : str
        "forward", "left", "right", or "up"
    """
    # These are global in the original script, ensure they are accessible or passed if needed.
    # left = [36, 37, 38, 39, 40, 41]
    # right = [42, 43, 44, 45, 46, 47]
    # kernel = np.ones((9, 9), np.uint8)
    
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    mask, end_points_left = eye_on_mask(mask.copy(), left, shape) # Pass copy of mask
    mask_right_only = np.zeros(img.shape[:2], dtype=np.uint8) # Separate mask for right eye points
    mask_right_only, end_points_right = eye_on_mask(mask_right_only, right, shape)
    
    # Combine masks if necessary or process separately. For eye region extraction, separate is fine.
    # The original track_eye dilates a combined mask. Let's try to mimic that for eye extraction.
    # Create a combined mask for dilation then split for contouring by ROI later if needed.
    # However, simpler is to get eye regions based on landmarks directly.

    # Simplified eye region extraction and processing based on track_eye logic
    eyes = cv2.bitwise_and(img, img, mask=cv2.dilate(mask, kernel, 5)) # Left eye region
    eyes_right_region = cv2.bitwise_and(img, img, mask=cv2.dilate(mask_right_only, kernel, 5)) # Right eye region

    # Process left eye
    mask_left_processed = (eyes == [0, 0, 0]).all(axis=2)
    eyes[mask_left_processed] = [255, 255, 255]
    eyes_gray_left = cv2.cvtColor(eyes, cv2.COLOR_BGR2GRAY)
    
    # Process right eye (need to combine logic carefully)
    # For the right eye, we need its gray representation from its specific region
    mask_right_processed = (eyes_right_region == [0,0,0]).all(axis=2)
    eyes_right_region[mask_right_processed] = [255,255,255]
    eyes_gray_right = cv2.cvtColor(eyes_right_region, cv2.COLOR_BGR2GRAY)
    
    mid = int((shape[42][0] + shape[39][0]) // 2) # Midpoint calculation based on landmarks

    _, thresh_left = cv2.threshold(eyes_gray_left, threshold_val, 255, cv2.THRESH_BINARY)
    thresh_left_processed = process_thresh(thresh_left)
    
    _, thresh_right = cv2.threshold(eyes_gray_right, threshold_val, 255, cv2.THRESH_BINARY)
    thresh_right_processed = process_thresh(thresh_right)

    # The contouring function expects a segment of the thresholded image.
    # We need to be careful with coordinates here. Contouring is done on the eye region.
    # The contouring function in the original script uses slicing on a combined thresholded image of both eyes.
    # Let's adapt by passing the relevant part of the thresholded eye image directly.

    # Extract the ROI for the left eye from its processed threshold image
    lx, ly, l_rx, l_by = end_points_left # These are absolute coords
    # Ensure ROI is within bounds and non-empty
    roi_thresh_left = thresh_left_processed[ly:l_by, lx:l_rx]
    
    # Extract the ROI for the right eye
    rx_start, ry_start, r_rx_end, r_by_end = end_points_right
    roi_thresh_right = thresh_right_processed[ry_start:r_by_end, rx_start:r_rx_end]

    # We need to adjust how `contouring` is called. It expects `img` for drawing circles, which we don't need.
    # It also expects `mid` for right eye adjustment, which is complex if we pass isolated eye images.
    # Let's simplify the return logic from `print_eye_pos`
    # The `contouring` function itself calls `find_eyeball_position` which returns 0 (normal), 1 (ratio > 3), 2 (ratio < 0.33), 3 (y_ratio < 0.33)
    # These correspond to: 1: left, 2: right, 3: up, 0: forward/normal.

    # Stubbing img for contouring as it's only used for cv2.circle
    # We need to pass the relevant section of the *original* thresholded image to contouring
    # Or, adjust contouring to work with the ROI and relative coordinates.
    # For simplicity, let's try to get cx, cy from the ROI itself and then use original end_points.

    # Left eye eyeball position
    eyeball_pos_left = None
    if roi_thresh_left.size > 0 :
        # Adapt contouring or its internal logic for isolated eye image
        cnts_left, _ = cv2.findContours(roi_thresh_left, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        try:
            if cnts_left:
                cnt_left = max(cnts_left, key=cv2.contourArea)
                M_left = cv2.moments(cnt_left)
                if M_left['m00'] != 0:
                    cx_left_roi = int(M_left['m10']/M_left['m00'])
                    cy_left_roi = int(M_left['m01']/M_left['m00'])
                    # Convert ROI cx, cy to absolute image cx, cy
                    cx_left_abs = lx + cx_left_roi
                    cy_left_abs = ly + cy_left_roi
                    eyeball_pos_left = find_eyeball_position(end_points_left, cx_left_abs, cy_left_abs)
        except Exception as e:
            print(f"Error processing left eye: {e}") # For debugging in container logs
            pass 

    # Right eye eyeball position
    eyeball_pos_right = None
    if roi_thresh_right.size > 0:
        cnts_right, _ = cv2.findContours(roi_thresh_right, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        try:
            if cnts_right:
                cnt_right = max(cnts_right, key=cv2.contourArea)
                M_right = cv2.moments(cnt_right)
                if M_right['m00'] != 0:
                    cx_right_roi = int(M_right['m10']/M_right['m00'])
                    cy_right_roi = int(M_right['m01']/M_right['m00'])
                    # Convert ROI cx, cy to absolute image cx, cy
                    cx_right_abs = rx_start + cx_right_roi
                    cy_right_abs = ry_start + cy_right_roi
                    eyeball_pos_right = find_eyeball_position(end_points_right, cx_right_abs, cy_right_abs)
        except Exception as e:
            print(f"Error processing right eye: {e}") # For debugging
            pass 

    # Determine overall status based on left and right eye positions
    # This logic is based on `print_eye_pos`
    if eyeball_pos_left is not None and eyeball_pos_right is not None:
        if eyeball_pos_left == eyeball_pos_right and eyeball_pos_left != 0:
            if eyeball_pos_left == 1:
                return "left"
            elif eyeball_pos_left == 2:
                return "right"
            elif eyeball_pos_left == 3:
                return "up"
        # If they disagree or one is undetermined, or both are 0, consider forward
        return "forward" 
    elif eyeball_pos_left is not None and eyeball_pos_left != 0:
        # Only left eye conclusive
        if eyeball_pos_left == 1: return "left"
        if eyeball_pos_left == 2: return "right"
        if eyeball_pos_left == 3: return "up"
    elif eyeball_pos_right is not None and eyeball_pos_right != 0:
        # Only right eye conclusive
        if eyeball_pos_right == 1: return "left"
        if eyeball_pos_right == 2: return "right"
        if eyeball_pos_right == 3: return "up"

    return "forward" # Default / undetermined / both eyes looking forward

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
