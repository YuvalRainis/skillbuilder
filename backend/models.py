from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from datetime import datetime
from database import Base

class UserSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)

class TimelineItem(Base):
    __tablename__ = "timeline"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    title = Column(String)
    coach_summary = Column(String)
    status = Column(String)  # planned | in_progress | completed
    difficulty = Column(String, nullable=True)  # e.g., "●●" or "Beginner-Intermediate"
    skill_focus = Column(String, nullable=True)  # e.g., "Active Listening"
    estimated_time = Column(String, nullable=True)  # e.g., "15 mins"
    task_type = Column(String, nullable=True, default="simulation")  # simulation | analysis | interpretation | planning | technique
    task_content = Column(Text, nullable=True)  # JSON string with task-specific content
    grade = Column(Integer, nullable=True)  # 0-5 grade received upon completion
    feedback = Column(Text, nullable=True)  # User feedback/reflection text from coach agent
    has_started = Column(Integer, nullable=True, default=0)  # 0=not started, 1=user clicked Start Practice
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    task_title = Column(String)  # Add this field to associate messages with a specific task
    sender = Column(String)  # "user" | "manager" | "coach"
    text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    meta_info = Column(String, nullable=True)  # JSON string for extra data

class Reflection(Base):
    __tablename__ = "reflections"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    task_title = Column(String)
    difficulty = Column(Integer)   # 1–5
    confidence = Column(Integer)   # 1–5
    comment = Column(String)
