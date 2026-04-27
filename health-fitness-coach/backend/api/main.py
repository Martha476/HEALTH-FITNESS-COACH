import logging
import uuid
import os
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from config import settings
    from api.schemas import (
        ChatRequest, ChatResponse, Settings as SettingsSchema,
        Feedback, HealthCheckResponse,
    )
    from api.auth import (
        RegisterRequest, LoginRequest, AuthResponse, UserResponse,
        register_user, login_user, get_current_user, logout_user,
    )
except ImportError:
    from .config import settings
    from .api.schemas import ChatRequest, ChatResponse, HealthCheckResponse
    from .api.auth import register_user, login_user, get_current_user

from agent.fitness_agent import FitnessCoachAgent
from agent.memory import MemoryManager
from database import init_db, get_db
from database.models import User, UserSettings, TokenUsage, UserStats, WaterIntake

from api.workouts import router as workouts_router
from api.nutrition import router as nutrition_router
from api.meals_log import router as meals_log_router
from api.barcode_scanner import router as barcode_scanner_router
from api.water_intake import router as water_intake_router
from api.food_search import router as food_search_router
from api.suggestions import router as suggestions_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Health Fitness Coach API",
    description="AI-powered fitness coaching API with LangGraph",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(workouts_router)
app.include_router(nutrition_router)
app.include_router(meals_log_router)
app.include_router(barcode_scanner_router)
app.include_router(water_intake_router)
app.include_router(food_search_router)
app.include_router(suggestions_router)

try:
    agent = FitnessCoachAgent()
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not found. Agent will run in Dynamic Mock mode.")
        agent_initialized = False
    else:
        agent_initialized = True
except Exception as e:
    agent = None
    agent_initialized = False
    logger.error(f"Agent initialization failed: {str(e)}. Using fallback logic.")

memory_manager = MemoryManager()


@app.on_event("startup")
async def startup_event():
    init_db()
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    logger.info("Database initialized and Storage directory ready.")


def _uid(user) -> str:
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user["id"] if isinstance(user, dict) else user.id


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    return register_user(request)


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    return login_user(request)


@app.get("/api/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"id": _uid(user), "email": getattr(user, "email", "unknown")}


@app.post("/api/token-usage")
async def log_token_usage(request: Request):
    return {"status": "ignored"}


# ── Profile ───────────────────────────────────────────────────────────────────

@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {
            "id": user_id,
            "name": "User",
            "email": "",
            "age": None,
            "weight": None,
            "height": None,
            "fitnessGoal": "general_fitness",
            "activityLevel": "moderate",
            "preferredUnit": "metric",
        }
    settings_row = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    return {
        "id": user_id,
        "name": getattr(user, "name", ""),
        "email": getattr(user, "email", ""),
        "age": getattr(settings_row, "age", None) if settings_row else None,
        "weight": getattr(settings_row, "weight", None) if settings_row else None,
        "height": getattr(settings_row, "height", None) if settings_row else None,
        "fitnessGoal": getattr(settings_row, "fitness_goal", "general_fitness") if settings_row else "general_fitness",
        "activityLevel": getattr(settings_row, "activity_level", "moderate") if settings_row else "moderate",
        "preferredUnit": getattr(settings_row, "preferred_unit", "metric") if settings_row else "metric",
    }


@app.put("/api/profile/{user_id}")
async def update_profile(user_id: str, request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    settings_row = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    if not settings_row:
        settings_row = UserSettings(user_id=user_id)
        db.add(settings_row)

    for field, col in {
        "age": "age",
        "weight": "weight",
        "height": "height",
        "fitnessGoal": "fitness_goal",
        "activityLevel": "activity_level",
        "preferredUnit": "preferred_unit",
    }.items():
        if field in body:
            setattr(settings_row, col, body[field])

    db.commit()
    return {"status": "updated", "user_id": user_id}


# ── Weather / Exercise Recommendations ────────────────────────────────────────

@app.get("/api/weather/exercise-recommendations")
async def weather_exercise_recommendations(
    latitude: float = 0.0,
    longitude: float = 0.0,
    country_code: str = "US",
):
    """
    Returns exercise recommendations based on approximate weather conditions.
    Uses static seasonal logic — no external API key required.
    Swap the body for a real weather API call when ready.
    """
    month = datetime.utcnow().month
    if country_code in ("AU", "NZ", "ZA", "AR", "BR"):
        is_summer = month in (12, 1, 2)
        is_winter = month in (6, 7, 8)
    else:
        is_summer = month in (6, 7, 8)
        is_winter = month in (12, 1, 2)

    if is_summer:
        condition = "hot"
        recommendations = [
            "Exercise early morning (6–8 AM) to avoid peak heat",
            "Stay hydrated — drink water every 15 minutes during outdoor workouts",
            "Consider swimming, cycling in shade, or indoor gym sessions",
            "Wear light, breathable clothing and sunscreen",
        ]
        indoor_focus = False
    elif is_winter:
        condition = "cold"
        recommendations = [
            "Warm up for at least 10 minutes before any outdoor activity",
            "Layer clothing — remove layers as your body heats up",
            "Indoor alternatives: gym, yoga, home HIIT, treadmill",
            "Keep workouts shorter and more intense to stay warm",
        ]
        indoor_focus = True
    else:
        condition = "mild"
        recommendations = [
            "Great weather for outdoor runs, cycling, or team sports",
            "Aim for 30–60 minutes of moderate activity",
            "Mix outdoor cardio with strength training indoors",
            "Ideal conditions — push slightly harder than usual",
        ]
        indoor_focus = False

    return {
        "condition": condition,
        "indoor_focus": indoor_focus,
        "recommendations": recommendations,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── Chat ──────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_id = request.user_profile.get("id", "default")
    user_name = request.user_profile.get("name", "there")
    primary_goal = request.user_profile.get("primary_goal", "your fitness goals")

    memory_manager.save_user_context(user_id, {"profile": request.user_profile})
    history = [{"role": msg.role, "content": msg.content} for msg in request.history]

    if agent_initialized and agent:
        try:
            response = await agent.chat(
                message=request.message,
                user_profile=request.user_profile,
                settings=request.settings,
                history=history,
            )
            return ChatResponse(**response)
        except Exception as e:
            logger.error(f"AI Agent error: {str(e)}")

    dynamic_response = (
        f"Hi {user_name}! I've looked at your request: '{request.message}'.\n\n"
        f"Since your primary goal is {primary_goal}, I recommend focusing on "
        "consistency and tracking your daily metrics. I'm currently running in "
        "offline mode (no API key configured), but your dashboard is fully "
        "functional for logging workouts and water intake.\n\n"
        "To unlock full AI coaching, add your `OPENAI_API_KEY` to `backend/.env`."
    )

    return ChatResponse(
        response=dynamic_response,
        tokenUsage={"prompt": 0, "completion": 0, "total": 0},
        metadata={"mock_response": True, "user_id": user_id},
    )


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats/{user_id}")
async def get_stats(user_id: str, db: Session = Depends(get_db)):
    total_minutes = db.query(func.sum(UserStats.workout_minutes)).filter(
        UserStats.user_id == user_id
    ).scalar() or 0

    workout_count = db.query(func.count(UserStats.id)).filter(
        UserStats.user_id == user_id
    ).scalar() or 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    water_intake = db.query(func.sum(WaterIntake.ounces)).filter(
        WaterIntake.user_id == user_id,
        WaterIntake.logged_date >= today_start,
    ).scalar() or 0

    return {
        "stats": [
            {
                "userId": user_id,
                "caloriesBurned": int(total_minutes * 5),
                "workoutCount": workout_count,
                "totalMinutes": total_minutes,
                "waterIntake": water_intake,
            }
        ]
    }


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    return HealthCheckResponse(
        status="healthy",
        version=settings.VERSION,
        timestamp=datetime.now(),
    )


if __name__ == "__main__":
    module_path = "main:app" if os.path.exists("main.py") else "api.main:app"
    uvicorn.run(module_path, host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)