# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from users import router as users_router
from video_processing import router as video_processing_router
from database import engine
from models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(video_processing_router, prefix="/video", tags=["video"])

@app.get("/")
def read_root():
    return {"message": "Fleet Management API"}