# models.py
from sqlalchemy import Column, Integer, String, Enum, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class Role(enum.Enum):
    admin = "admin"
    driver = "driver"

class Status(enum.Enum):
    active = "active"
    inactive = "inactive"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, index=True)
    dni = Column(String, unique=True, index=True)
    status = Column(Enum(Status), default=Status.active)
    password = Column(String)
    role = Column(Enum(Role), default=Role.driver)
    url_video = Column(String, nullable=True)
    
    # Definir relación con VideoProcessing
    video_processings = relationship("VideoProcessing", back_populates="user", cascade="all, delete-orphan")

class VideoProcessing(Base):
    __tablename__ = "video_processing"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    blinks_detected = Column(Integer, default=0)
    microsleeps = Column(Float, default=0.0)
    yawns_detected = Column(Integer, default=0)
    yawns_duration = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación inversa con User
    user = relationship("User", back_populates="video_processings")