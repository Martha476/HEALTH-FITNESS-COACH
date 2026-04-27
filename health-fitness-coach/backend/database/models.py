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
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    weight_lbs = Column(Float, nullable=True)
    height_inches = Column(Float, nullable=True)
    fitness_level = Column(String(50), nullable=True)
    goals = Column(JSON, nullable=True)
    injuries = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user")
    stats = relationship("UserStats", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")
    body_measurements = relationship("BodyMeasurement")
    water_intake = relationship("WaterIntake")
    meal_photos = relationship("MealPhoto")
    workout_suggestions = relationship("WorkoutSuggestion")
    recipe_suggestions = relationship("RecipeSuggestion")
    weekly_reports = relationship("WeeklyReport")


class Conversation(Base):
    """Conversation model"""
    
    __tablename__ = "conversations"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    title = Column(String(200), nullable=True)
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
    role = Column(String(20), nullable=True)  # "user" or "assistant"
    content = Column(String, nullable=True)
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
    weight_lbs = Column(Float, nullable=True)
    body_fat_percent = Column(Float, nullable=True)
    workout_minutes = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    recorded_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="stats")


class Feedback(Base):
    """User feedback on responses"""
    
    __tablename__ = "feedback"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    message_id = Column(String(50), nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5
    comment = Column(String, nullable=True)
    helpful = Column(Boolean, nullable=True)
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
    model = Column(String(100), nullable=True)
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
    name = Column(String(100), nullable=True)
    description = Column(String, nullable=True)
    plan_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NutritionPlan(Base):
    """Saved nutrition plans"""
    
    __tablename__ = "nutrition_plans"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    target_calories = Column(Integer, nullable=True)
    macros = Column(JSON, nullable=True)
    meal_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BodyMeasurement(Base):
    """Body measurement tracking for analytics"""
    
    __tablename__ = "body_measurements"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    weight_lbs = Column(Float, nullable=True)
    chest_inches = Column(Float, nullable=True)
    waist_inches = Column(Float, nullable=True)
    hips_inches = Column(Float, nullable=True)
    arms_inches = Column(Float, nullable=True)
    body_fat_percent = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    measured_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class WaterIntake(Base):
    """Daily water intake tracking"""
    
    __tablename__ = "water_intake"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    glasses = Column(Integer, default=0)
    ounces = Column(Float, default=0.0)
    daily_goal_ounces = Column(Float, default=64.0)
    logged_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class MealPhoto(Base):
    """Meal photos for AI-based calorie estimation"""
    
    __tablename__ = "meal_photos"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    photo_url = Column(String, nullable=True)  # S3 or local storage URL
    estimated_calories = Column(Float, nullable=True)  # AI-estimated
    estimated_macros = Column(JSON, nullable=True)  # {protein, carbs, fats}
    user_notes = Column(String, nullable=True)
    meal_type = Column(String(50), nullable=True)  # breakfast, lunch, dinner, snack
    logged_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkoutSuggestion(Base):
    """Track proactive AI suggestions given to user"""
    
    __tablename__ = "workout_suggestions"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    suggestion_text = Column(String, nullable=True)
    reason = Column(String, nullable=True)  # "no_workout_3_days", "progressive_overload", etc.
    accepted = Column(Boolean, default=False)
    accepted_at = Column(DateTime, nullable=True)
    suggested_at = Column(DateTime, default=datetime.utcnow)


class RecipeSuggestion(Base):
    """AI-generated recipe suggestions matching macro goals"""
    
    __tablename__ = "recipe_suggestions"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    recipe_name = Column(String(200), nullable=True)
    ingredients = Column(JSON, nullable=True)  # List of ingredients with amounts
    instructions = Column(String, nullable=True)
    estimated_calories = Column(Float, nullable=True)
    macros = Column(JSON, nullable=True)  # {protein, carbs, fats}
    prep_time_minutes = Column(Integer, nullable=True)
    dietary_tags = Column(JSON, nullable=True)  # ["vegan", "keto", etc.]
    match_score = Column(Float, nullable=True)  # 0-100 how well it matches user goals
    suggested_at = Column(DateTime, default=datetime.utcnow)


class WeeklyReport(Base):
    """Pre-calculated weekly fitness summary"""
    
    __tablename__ = "weekly_reports"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    week_start = Column(DateTime, nullable=True)
    week_end = Column(DateTime, nullable=True)
    total_workouts = Column(Integer, default=0)
    total_minutes = Column(Integer, default=0)
    avg_calories_burned = Column(Float, nullable=True)
    total_calories_logged = Column(Float, nullable=True)
    avg_daily_calories = Column(Float, nullable=True)
    weight_change_lbs = Column(Float, nullable=True)
    trends = Column(JSON, nullable=True)  # {weight_trend, calorie_trend, workout_trend}
    insights = Column(String, nullable=True)  # AI-generated summary
    generated_at = Column(DateTime, default=datetime.utcnow)


class ExerciseVideo(Base):
    """Exercise video library with form guidance"""
    
    __tablename__ = "exercise_videos"
    
    id = Column(String(50), primary_key=True)
    exercise_name = Column(String(100), unique=True)
    video_url = Column(String, nullable=True)
    gif_url = Column(String, nullable=True)
    form_tips = Column(JSON, nullable=True)  # List of form tips
    common_mistakes = Column(JSON, nullable=True)  # List of mistakes to avoid
    variations = Column(JSON, nullable=True)  # {easier, harder} modifications
    muscle_groups = Column(JSON, nullable=True)  # ["chest", "triceps"]
    created_at = Column(DateTime, default=datetime.utcnow)


class MealLog(Base):
    """User meal logging with nutrition data"""
    
    __tablename__ = "meal_logs"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    meal_type = Column(String(50), nullable=True)  # breakfast, lunch, dinner, snack
    name = Column(String(200), nullable=True)  # Food name
    calories = Column(Float, default=0)
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fiber_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    sugar_g = Column(Float, nullable=True)
    quantity = Column(Integer, default=1)
    source = Column(String(50), nullable=True)  # "manual", "barcode_scan", "food_search", "recipe"
    barcode = Column(String(50), nullable=True)  # For barcode scans
    image_url = Column(String, nullable=True)
    logged_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class BarcodeItem(Base):
    """Track scanned barcode products for quick re-logging"""
    
    __tablename__ = "barcode_items"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    barcode = Column(String(50), unique=True, index=True)
    product_name = Column(String(200))
    brand = Column(String(100), nullable=True)
    serving_size = Column(String(50))
    calories = Column(Float)
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fiber_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    sugar_g = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    ingredients = Column(String, nullable=True)
    allergens = Column(String, nullable=True)
    times_scanned = Column(Integer, default=1)
    last_scanned = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
