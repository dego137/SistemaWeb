from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
from models import User, VideoProcessing
from auth import get_current_user
from drowsiness_analyzer import DrowsinessAnalyzer
import asyncio
import cv2
import base64
import numpy as np

router = APIRouter()

async def encode_frame(frame):
    try:
        _, buffer = await asyncio.to_thread(cv2.imencode, '.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
        frame_b64 = base64.b64encode(buffer).decode('utf-8')
        print("Frame encoded successfully")
        return frame_b64
    except Exception as e:
        print(f"Error encoding frame: {e}")
        return None

@router.websocket("/analyze/{user_id}")
async def analyze_video(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await websocket.accept()
    analyzer = None
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.url_video:
            await websocket.send_json({"error": "User not found or no video URL provided"})
            return

        analyzer = DrowsinessAnalyzer(user.url_video, user_id, db)
        for indicators, frame in analyzer.process_video_with_frames():
            try:
                if frame is not None:
                    frame_b64 = await encode_frame(frame)
                    if frame_b64:
                        await websocket.send_json({
                            "indicators": indicators,
                            "frame": f"data:image/jpeg;base64,{frame_b64}"
                        })
                        print(f"Sent frame with indicators: {indicators}")
                    else:
                        await websocket.send_json({"indicators": indicators})
                        print("Sent indicators only (frame encoding failed)")
                else:
                    await websocket.send_json({"indicators": indicators})
                    print("Sent indicators only (no frame)")
                await asyncio.sleep(0.033)  # ~30 FPS for URL-based videos
            except WebSocketDisconnect:
                print("WebSocket disconnected during frame send")
                break
        await websocket.send_json({"status": "completed"})
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error in analyze_video: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except (WebSocketDisconnect, RuntimeError):
            print("Could not send error message: WebSocket already closed")
    finally:
        if analyzer:
            try:
                analyzer.save_report()
                print("Saved partial report for video analysis")
            except Exception as e:
                print(f"Error saving report: {e}")
        try:
            await websocket.close()
        except RuntimeError:
            print("WebSocket already closed")

@router.websocket("/analyze_realtime/{user_id}")
async def analyze_realtime(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await websocket.accept()
    analyzer = None
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.send_json({"error": "User not found"})
            return

        camera_indices = [0, 1, 2, 3]
        cap = None
        selected_index = None
        for index in camera_indices:
            cap = cv2.VideoCapture(index)
            if cap.isOpened():
                selected_index = index
                print(f"Camera opened successfully on index {index}")
                break
            cap.release()
        if not cap or not cap.isOpened():
            error_msg = "No se pudo acceder a ninguna cámara. Verifica que esté conectada y disponible."
            await websocket.send_json({"error": error_msg})
            raise ValueError(error_msg)
        cap.release()

        analyzer = DrowsinessAnalyzer(selected_index, user_id, db, is_stream=True)
        frame_count = 0
        for indicators, frame in analyzer.process_video_with_frames():
            try:
                frame_count += 1
                if frame is not None:
                    frame_b64 = await encode_frame(frame)
                    if frame_b64:
                        await websocket.send_json({
                            "indicators": indicators,
                            "frame": f"data:image/jpeg;base64,{frame_b64}"
                        })
                        print(f"Sent frame {frame_count} for user {user_id} with indicators: {indicators}")
                    else:
                        await websocket.send_json({"indicators": indicators})
                        print(f"Sent indicators only for frame {frame_count} (frame encoding failed)")
                else:
                    await websocket.send_json({"indicators": indicators})
                    print(f"Sent indicators only for frame {frame_count} (no frame)")
                await asyncio.sleep(0.016)  # ~60 FPS
            except WebSocketDisconnect:
                print("WebSocket disconnected during frame send")
                break
        await websocket.send_json({"status": "completed"})
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error in analyze_realtime: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except (WebSocketDisconnect, RuntimeError):
            print("Could not send error message: WebSocket already closed")
    finally:
        if analyzer:
            try:
                analyzer.save_report()
                print("Saved partial report for real-time analysis")
            except Exception as e:
                print(f"Error saving report: {e}")
        try:
            await websocket.close()
        except RuntimeError:
            print("WebSocket already closed")

@router.get("/reports", response_model=list[dict])
def get_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        reports = (
            db.query(VideoProcessing, User)
            .join(User, VideoProcessing.user_id == User.id)
            .all()
        )
        return [
            {
                "id": report.id,
                "user_id": report.user_id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone_number": user.phone_number,
                "dni": user.dni,
                "status": user.status,
                "blinks_detected": report.blinks_detected,
                "microsleeps": report.microsleeps,
                "yawns_detected": report.yawns_detected,
                "yawns_duration": report.yawns_duration,
                "created_at": report.created_at.isoformat()
            }
            for report, user in reports
        ]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching reports: {str(e)}")