"""API schemas for the Health Fitness Coach"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class UserProfile(BaseModel):
    """User profile information"""
    id: Optional[str] = None
    name: str
    age: int = Field(ge=13, le=120)
    gender: str = Field(pattern="^(male|female|other)$")
    weight_lbs: float
    height_inches: float
    fitness_level: str = Field(
        pattern="^(beginner|intermediate|advanced)$"
    )
    goals: List[str]
    injuries: List[str] = []
    equipment_available: List[str] = []


class ChatMessage(BaseModel):
    """Chat message"""
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    """Chat request"""
    message: str = Field(min_length=1)
    settings: Dict[str, Any]
    user_profile: Dict[str, Any]
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    """Chat response"""
    response: str
    tokenUsage: Dict[str, float]
    metadata: Dict[str, Any]


class Settings(BaseModel):
    """LLM Settings"""

    # Frontend fields
    llm: str = Field(
        default="openai",
        pattern="^(openai|anthropic|google)$"
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    topP: float = Field(default=0.9, ge=0.0, le=1.0)
    frequencyPenalty: float = Field(
        default=0.0, ge=0.0, le=2.0
    )
    personality: str = Field(
        default="friendly",
        pattern="^(friendly|formal|concise)$"
    )
    enableCache: bool = True
    enableTools: bool = True
    enabledTools: List[str] = [
        "generate_workout_plan",
        "calculate_nutrition",
        "analyze_progress",
        "search_exercises",
        "track_goals"
    ]

    # FIX: Backend fields needed by fitness_agent.py
    ENABLE_RETRY: bool = True
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 1
    ENABLE_RAG: bool = False
    ENABLE_CACHE: bool = False
    ENABLE_TOKEN_TRACKING: bool = True
    ENABLE_FEEDBACK: bool = True
    ENABLE_AUTH: bool = False
    DEFAULT_LLM: str = "openai"
    OPENAI_MODEL: str = "gpt-4"
    ANTHROPIC_MODEL: str = "claude-opus-4-20250514"
    GOOGLE_MODEL: str = "gemini-1.5-pro"

    class Config:
        populate_by_name = True
        extra = "allow"


class WorkoutPlan(BaseModel):
    """Workout plan"""
    name: str
    description: str
    duration_weeks: int
    structure: List[Dict[str, Any]]


class NutritionPlan(BaseModel):
    """Nutrition plan"""
    daily_calorie_target: int
    macros: Dict[str, Dict[str, float]]
    meal_frequency: str
    hydration: str
    recommendations: List[str]


class ProgressReport(BaseModel):
    """Progress report"""
    timeframe_days: int
    metrics_analyzed: List[str]
    trends: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]


class Feedback(BaseModel):
    """User feedback on responses"""
    message_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    helpful: Optional[bool] = None


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    timestamp: datetime