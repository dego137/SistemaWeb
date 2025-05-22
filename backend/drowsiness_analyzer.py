import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp
from sqlalchemy.orm import Session
from models import VideoProcessing
from datetime import datetime
import pytz  # Importa pytz para manejar zonas horarias

class DrowsinessAnalyzer:
    def __init__(self, video_source, user_id, db: Session, is_stream=False):
        self.video_source = video_source
        self.user_id = user_id
        self.db = db
        self.is_stream = is_stream

        self.yawn_state = ''
        self.left_eye_state = ''
        self.right_eye_state = ''
        
        self.blinks = 0
        self.microsleeps = 0.0
        self.yawns = 0
        self.yawn_duration = 0.0
        
        self.left_eye_still_closed = False
        self.right_eye_still_closed = False
        self.yawn_in_progress = False

        # Define MediaPipe landmark indices for face regions
        self.points_ids = [187, 411, 152, 68, 174, 399, 298]  # Mouth and eye landmarks

        try:
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5)
            print("MediaPipe FaceMesh initialized")
        except Exception as e:
            print(f"Error initializing FaceMesh: {e}")
            raise

        try:
            self.detectyawn = YOLO("runs/detectyawn/train/weights/best.pt")
            self.detecteye = YOLO("runs/detecteye/train/weights/best.pt")
            print("YOLO models loaded successfully")
        except Exception as e:
            print(f"Error loading YOLO models: {e}")
            raise

        print(f"Initialized DrowsinessAnalyzer for user {user_id}, video_source: {video_source}, is_stream: {is_stream}")

    def predict_eye(self, eye_frame, eye_state):
        if eye_frame is None or eye_frame.size == 0:
            print("Empty or invalid eye frame, skipping prediction")
            return eye_state
        try:
            results_eye = self.detecteye.predict(eye_frame, verbose=False, conf=0.3)
            boxes = results_eye[0].boxes
            if len(boxes) == 0:
                print("No eye detections")
                return eye_state

            confidences = boxes.conf.cpu().numpy()
            class_ids = boxes.cls.cpu().numpy()
            max_confidence_index = np.argmax(confidences)
            class_id = int(class_ids[max_confidence_index])
            confidence = confidences[max_confidence_index]

            if class_id == 1:
                eye_state = "Close Eye"
                print(f"Eye state: Close Eye (confidence: {confidence:.2f})")
            elif class_id == 0 and confidence > 0.30:
                eye_state = "Open Eye"
                print(f"Eye state: Open Eye (confidence: {confidence:.2f})")
        except Exception as e:
            print(f"Error predicting eye state: {e}")
        return eye_state

    def predict_yawn(self, yawn_frame):
        if yawn_frame is None or yawn_frame.size == 0:
            print("Empty or invalid yawn frame, skipping prediction")
            return self.yawn_state
        try:
            results_yawn = self.detectyawn.predict(yawn_frame, verbose=False, conf=0.5)
            boxes = results_yawn[0].boxes
            if len(boxes) == 0:
                print("No yawn detections")
                return self.yawn_state

            confidences = boxes.conf.cpu().numpy()
            class_ids = boxes.cls.cpu().numpy()
            max_confidence_index = np.argmax(confidences)
            class_id = int(class_ids[max_confidence_index])
            confidence = confidences[max_confidence_index]

            if class_id == 0:
                self.yawn_state = "Yawn"
                print(f"Yawn state: Yawn (confidence: {confidence:.2f})")
            elif class_id == 1 and confidence > 0.50:
                self.yawn_state = "No Yawn"
                print(f"Yawn state: No Yawn (confidence: {confidence:.2f})")
        except Exception as e:
            print(f"Error predicting yawn state: {e}")
        return self.yawn_state

    def process_video_with_frames(self):
        cap = cv2.VideoCapture(self.video_source if not self.is_stream else int(self.video_source))
        if not cap.isOpened():
            print(f"Failed to open video source: {self.video_source}")
            raise ValueError(f"No se pudo abrir la fuente de video: {self.video_source}")
        print(f"Opened video source: {self.video_source}, is_stream: {self.is_stream}")
        
        fps = cap.get(cv2.CAP_PROP_FPS) if not self.is_stream else 30
        frame_duration = 1.0 / fps if fps > 0 else 0.033
        frame_count = 0
        process_every_n_frames = 3

        try:
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    print(f"Failed to read frame from video source: {self.video_source}")
                    break

                frame = cv2.resize(frame, (320, 180))
                frame_count += 1
                if frame_count % process_every_n_frames != 0:
                    yield {
                        "blinks": self.blinks,
                        "microsleeps": round(self.microsleeps, 2),
                        "yawns": self.yawns,
                        "yawn_duration": round(self.yawn_duration, 2)
                    }, frame
                    continue

                image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.face_mesh.process(image_rgb)
                print(f"Frame {frame_count}: FaceMesh processed, landmarks detected: {bool(results.multi_face_landmarks)}")

                if results.multi_face_landmarks:
                    for face_landmarks in results.multi_face_landmarks:
                        ih, iw, _ = frame.shape
                        points = []

                        for point_id in self.points_ids:
                            lm = face_landmarks.landmark[point_id]
                            x, y = int(lm.x * iw), int(lm.y * ih)
                            points.append((x, y))

                        if len(points) >= 7:
                            x1, y1 = points[0]  # Mouth top
                            x2, _ = points[1]   # Mouth right
                            _, y3 = points[2]   # Mouth bottom
                            x4, y4 = points[3]  # Right eye top
                            x5, y5 = points[4]  # Right eye bottom
                            x6, y6 = points[5]  # Left eye top
                            x7, y7 = points[6]  # Left eye bottom

                            x6, x7 = min(x6, x7), max(x6, x7)
                            y6, y7 = min(y6, y7), max(y6, y7)

                            mouth_roi = frame[y1:y3, x1:x2]
                            right_eye_roi = frame[y4:y5, x4:x5]
                            left_eye_roi = frame[y6:y7, x6:x7]

                            try:
                                self.left_eye_state = self.predict_eye(left_eye_roi, self.left_eye_state)
                                self.right_eye_state = self.predict_eye(right_eye_roi, self.right_eye_state)
                                self.predict_yawn(mouth_roi)
                                print(f"Frame {frame_count}: Processed - blinks={self.blinks}, yawns={self.yawns}, left_eye={self.left_eye_state}, right_eye={self.right_eye_state}, yawn_state={self.yawn_state}")
                            except Exception as e:
                                print(f"Error en la predicción para frame {frame_count}: {e}")
                                continue

                            if self.left_eye_state == "Close Eye" and self.right_eye_state == "Close Eye":
                                if not self.left_eye_still_closed and not self.right_eye_still_closed:
                                    self.left_eye_still_closed, self.right_eye_still_closed = True, True
                                    self.blinks += 1
                                    print(f"Blink detected, total blinks: {self.blinks}")
                                self.microsleeps += frame_duration * process_every_n_frames
                            else:
                                if self.left_eye_still_closed and self.right_eye_still_closed:
                                    self.left_eye_still_closed, self.right_eye_still_closed = False, False
                                self.microsleeps = max(0, self.microsleeps - frame_duration * process_every_n_frames)

                            if self.yawn_state == "Yawn":
                                if not self.yawn_in_progress:
                                    self.yawn_in_progress = True
                                    self.yawns += 1
                                    print(f"Yawn detected, total yawns: {self.yawns}")
                                self.yawn_duration += frame_duration * process_every_n_frames
                            else:
                                if self.yawn_in_progress:
                                    self.yawn_in_progress = False

                yield {
                    "blinks": self.blinks,
                    "microsleeps": round(self.microsleeps, 2),
                    "yawns": self.yawns,
                    "yawn_duration": round(self.yawn_duration, 2)
                }, frame

        finally:
            cap.release()
            print(f"Released video source: {self.video_source}")

    def save_report(self):
        try:
            # Obtener la fecha actual en la zona horaria de Lima, Perú
            lima_tz = pytz.timezone('America/Lima')
            current_time = datetime.now(lima_tz)

            video_processing = VideoProcessing(
                user_id=self.user_id,
                blinks_detected=self.blinks,
                microsleeps=self.microsleeps,
                yawns_detected=self.yawns,
                yawns_duration=self.yawn_duration,
                created_at=current_time
            )
            self.db.add(video_processing)
            self.db.commit()
            self.db.refresh(video_processing)
            print(f"Saved report for user {self.user_id}: blinks={self.blinks}, yawns={self.yawns}, created_at={current_time}")
            return video_processing
        except Exception as e:
            print(f"Error saving report to database: {e}")
            self.db.rollback()
            raise  