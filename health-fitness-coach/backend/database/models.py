"""Database models for Health Fitness Coach"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """User model"""
    
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100))
    email = Column(String(100), unique=True)
    password_hash = Column(String(255), nullable=True)
    age = Column(Integer)
    gender = Column(String(20))
    weight_lbs = Column(Float)
    height_inches = Column(Float)
    fitness_level = Column(String(50))
    goals = Column(JSON)
    injuries = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user")
    stats = relationship("UserStats", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")


class Conversation(Base):
    """Conversation model"""
    
    __tablename__ = "conversations"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    title = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    """Chat message model"""
    
    __tablename__ = "messages"
    
    id = Column(String(50), primary_key=True)
    conversation_id = Column(String(50), ForeignKey("conversations.id"))
    role = Column(String(20))  # "user" or "assistant"
    content = Column(String)
    tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class UserStats(Base):
    """User fitness statistics"""
    
    __tablename__ = "user_stats"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    weight_lbs = Column(Float)
    body_fat_percent = Column(Float)
    workout_minutes = Column(Integer)
    notes = Column(String)
    recorded_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="stats")


class Feedback(Base):
    """User feedback on responses"""
    
    __tablename__ = "feedback"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    message_id = Column(String(50))
    rating = Column(Integer)  # 1-5
    comment = Column(String)
    helpful = Column(Boolean)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="feedback")


class UserSettings(Base):
    """User settings and preferences"""
    
    __tablename__ = "user_settings"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), unique=True)
    llm = Column(String(50), default="openai")
    temperature = Column(Float, default=0.7)
    topP = Column(Float, default=0.9)
    frequencyPenalty = Column(Float, default=0.0)
    personality = Column(String(50), default="friendly")
    enableCache = Column(Boolean, default=True)
    enableTools = Column(Boolean, default=True)
    enabledTools = Column(JSON, default=list)
    theme = Column(String(20), default="dark")
    language = Column(String(10), default="en")
    units = Column(String(20), default="metric")
    notifications = Column(Boolean, default=False)
    enabledAgents = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TokenUsage(Base):
    """Token usage tracking"""
    
    __tablename__ = "token_usage"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    model = Column(String(100))
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkoutPlan(Base):
    """Saved workout plans"""
    
    __tablename__ = "workout_plans"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    name = Column(String(100))
    description = Column(String)
    plan_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class NutritionPlan(Base):
    """Saved nutrition plans"""
    
    __tablename__ = "nutrition_plans"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    target_calories = Column(Integer)
    macros = Column(JSON)
    meal_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
