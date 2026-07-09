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


class SendVerificationEmailRequest(BaseModel):
    """Request to send verification email"""
    email: str
    name: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    """Request to verify email with token"""
    email: str
    token: str


class VerifyEmailResponse(BaseModel):
    """Response for email verification"""
    message: str
    email: str
    verified: bool


# ──── Body Measurements ────

class BodyMeasurementRequest(BaseModel):
    """Request to log body measurements"""
    weight_lbs: Optional[float] = None
    chest_inches: Optional[float] = None
    waist_inches: Optional[float] = None
    hips_inches: Optional[float] = None
    arms_inches: Optional[float] = None
    body_fat_percent: Optional[float] = None
    notes: Optional[str] = None
    measured_date: Optional[datetime] = None


class BodyMeasurementResponse(BaseModel):
    """Body measurement response"""
    id: str
    weight_lbs: Optional[float]
    chest_inches: Optional[float]
    waist_inches: Optional[float]
    hips_inches: Optional[float]
    arms_inches: Optional[float]
    body_fat_percent: Optional[float]
    measured_date: datetime
    created_at: datetime


# ──── Water Intake ────

class WaterIntakeRequest(BaseModel):
    """Request to log water intake"""
    glasses: int = 1
    ounces: Optional[float] = None


class WaterIntakeResponse(BaseModel):
    """Water intake response"""
    id: str
    glasses: int
    ounces: float
    daily_goal_ounces: float
    percentage_of_goal: float
    logged_date: datetime


# ──── Meal Photos ────

class MealPhotoRequest(BaseModel):
    """Request to upload meal photo"""
    photo_url: str
    meal_type: str  # breakfast, lunch, dinner, snack
    user_notes: Optional[str] = None


class MealPhotoResponse(BaseModel):
    """Meal photo response with AI estimation"""
    id: str
    photo_url: str
    meal_type: str
    estimated_calories: Optional[float]
    estimated_macros: Optional[Dict[str, float]]
    user_notes: Optional[str]
    logged_date: datetime


# ──── Workout Suggestions ────

class WorkoutSuggestionResponse(BaseModel):
    """Proactive workout suggestion"""
    id: str
    suggestion_text: str
    reason: str  # why this suggestion was made
    accepted: bool
    suggested_at: datetime


# ──── Recipe Suggestions ────

class RecipeSuggestionResponse(BaseModel):
    """AI-generated recipe matching user goals"""
    id: str
    recipe_name: str
    ingredients: List[Dict[str, str]]  # {ingredient, amount}
    instructions: str
    estimated_calories: float
    macros: Dict[str, float]  # {protein, carbs, fats}
    prep_time_minutes: int
    dietary_tags: List[str]
    match_score: float  # 0-100


# ──── Analytics & Insights ────

class TrendAnalysis(BaseModel):
    """Trend analysis for metrics"""
    metric: str
    current_value: float
    previous_value: Optional[float]
    change_percent: float
    direction: str  # "up", "down", "stable"
    insight: str
    recommendation: str


class WeeklyReportResponse(BaseModel):
    """Weekly fitness summary"""
    id: str
    week_start: datetime
    week_end: datetime
    total_workouts: int
    total_minutes: int
    avg_calories_burned: Optional[float]
    total_calories_logged: Optional[float]
    weight_change_lbs: Optional[float]
    trends: Dict[str, Any]  # {weight_trend, calorie_trend, workout_trend}
    insights: str
    generated_at: datetime


class GoalPredictionResponse(BaseModel):
    """Goal timeline prediction"""
    goal_name: str
    current_value: float
    target_value: float
    progress_percent: float
    estimated_completion_date: Optional[datetime]
    days_remaining: Optional[int]
    on_track: bool
    recommendation: str


class ComparativeChartData(BaseModel):
    """Week-over-week comparison"""
    this_week: Dict[str, Any]  # {metric: value}
    last_week: Dict[str, Any]
    difference: Dict[str, float]  # {metric: change}
    improvement_percent: float


# ──── Food Database Search ────

class FoodSearchRequest(BaseModel):
    """Search food database (OpenFoodFacts)"""
    query: str
    limit: int = 10


class FoodSearchResult(BaseModel):
    """Food search result from OpenFoodFacts"""
    name: str
    brand: Optional[str]
    serving_size: str
    calories: float
    protein_grams: Optional[float]
    carbs_grams: Optional[float]
    fats_grams: Optional[float]
    barcode: Optional[str]
    nutrition_grade: Optional[str]  # A, B, C, D, E


class FoodSearchResponse(BaseModel):
    """Food search response"""
    results: List[FoodSearchResult]
    total_found: int



class ResendVerificationEmailRequest(BaseModel):
    """Request to resend verification email"""
    email: str


# ──── Barcode Scanner ────

class BarcodeRequest(BaseModel):
    """Request to scan a barcode"""
    barcode: str
    quantity: Optional[int] = 1
    meal_type: Optional[str] = None  # breakfast, lunch, dinner, snack
    auto_log: Optional[bool] = False  # Auto-log as meal


class BarcodeProductResponse(BaseModel):
    """Response with product data from barcode scan"""
    success: bool
    message: str
    product: Optional[Dict[str, Any]] = None


class MealLogRequest(BaseModel):
    """Request to log a meal"""
    meal_type: str  # breakfast, lunch, dinner, snack
    name: str
    calories: float
    protein_g: Optional[float] = 0
    carbs_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    quantity: Optional[int] = 1
    source: Optional[str] = None  # "manual", "barcode_scan", "food_search", "recipe"


class MealLogResponse(BaseModel):
    """Response for logged meal"""
    id: str
    meal_type: str
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    logged_date: datetime
    created_at: datetime