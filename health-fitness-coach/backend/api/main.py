"""
Main FastAPI application for Health Fitness Coach.

Endpoints:
- POST /api/chat:            Send message to coach
- GET/PUT /api/settings:     Get/update settings
- GET /api/history:          Get chat history
- DELETE /api/history/{id}:  Delete message
- POST /api/feedback:        Submit feedback
- GET /health:               Health check
"""

import os
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from api.schemas import (
    ChatRequest,
    ChatResponse,
    Settings as SettingsSchema,
    Feedback,
    HealthCheckResponse,
)
from api.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    UpdatePasswordRequest,
    ResetPasswordRequest,
    DeleteAccountRequest,
    register_user,
    login_user,
    update_password,
    reset_password_admin,
    delete_account,
    get_current_user,
    logout_user,
)
from agent.fitness_agent import FitnessCoachAgent
from agent.memory import MemoryManager
from database import init_db, get_db
from database.models import User, UserSettings, TokenUsage
from sqlalchemy.orm import Session
import uuid

# ── App init ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Health Fitness Coach API",
    description="AI-powered fitness coaching API with LangGraph",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# FIX: Use allow_origins=["*"] so ANY origin is accepted during development.
# When allow_origins=["*"], allow_credentials MUST be False (browser security rule).
# We handle auth via Bearer token in headers, not cookies, so this is fine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Allow all origins — fixes OPTIONS 400
    allow_credentials=False,       # Must be False when allow_origins=["*"]
    allow_methods=["*"],           # Allow GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],           # Allow Authorization, Content-Type, etc.
    expose_headers=["*"],
)

# ── Agent init ─────────────────────────────────────────────────────────────────
try:
    agent = FitnessCoachAgent()
    agent_initialized = True
except Exception as e:
    agent = None
    agent_initialized = False
    print(f"  Agent initialization failed: {str(e)}")
    print("   The app will run in mock mode.")

memory_manager = MemoryManager()

# Store settings per session (in production, use database)
session_settings: Dict[str, Dict[str, Any]] = {}
user_feedback:    Dict[str, List[Dict[str, Any]]] = {}


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print(" Database tables created successfully")
    print("App started, DB initialized")


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest, db=Depends(get_db)):
    """Register a new user"""
    return register_user(request, db)


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, db=Depends(get_db)):
    """Login an existing user"""
    return login_user(request, db)


@app.post("/api/auth/logout")
async def logout(
    credentials=Depends(
        __import__("fastapi.security", fromlist=["HTTPBearer"]).HTTPBearer(auto_error=False)
    )
):
    """Logout user and invalidate token"""
    if credentials:
        return logout_user(credentials.credentials)
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"id": user.id, "name": user.name, "email": user.email}


@app.post("/api/auth/update-password")
async def update_user_password(request: UpdatePasswordRequest, db=Depends(get_db)):
    """Update user password (requires old password)"""
    return update_password(request, db)


@app.post("/api/auth/reset-password")
async def reset_user_password(request: ResetPasswordRequest, db=Depends(get_db)):
    """Reset user password (admin)"""
    return reset_password_admin(request, db)


@app.delete("/api/auth/delete-account")
async def delete_user_account(request: DeleteAccountRequest, db=Depends(get_db)):
    """Delete user account (requires password verification)"""
    return delete_account(request, db)


# ── Profile endpoints ──────────────────────────────────────────────────────────

@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile"""
    profile = memory_manager.get_context(user_id)
    return profile if profile else {}


@app.put("/api/profile/{user_id}")
async def update_profile(user_id: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    """Update user profile"""
    memory_manager.save_user_context(user_id, profile, SettingsSchema())
    return {"status": "profile_updated", "user_id": user_id}


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> HealthCheckResponse:
    """Health check endpoint"""
    return HealthCheckResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now(),
    )


# ── Chat ───────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Send a message to the fitness coach."""
    try:
        if not agent_initialized or agent is None:
            return ChatResponse(
                response=(
                    "👋 Hello! I'm your AI Fitness Coach.\n\n"
                    "⚠️ The AI backend is not fully configured.\n"
                    "Please add your OpenAI API key to backend/.env\n"
                    "and restart the backend server."
                ),
                tokenUsage={"prompt": 0, "completion": 0, "total": 0},
                metadata={"mock_response": True, "reason": "Agent not initialized"},
            )

        user_id = request.user_profile.get("id", "default")

        # Convert dict settings to SettingsSchema
        raw_settings = session_settings.get(user_id, request.settings)
        if isinstance(raw_settings, dict):
            try:
                user_settings = SettingsSchema(**raw_settings)
            except Exception:
                user_settings = SettingsSchema()
        elif raw_settings is None:
            user_settings = SettingsSchema()
        else:
            user_settings = raw_settings

        session_settings[user_id] = user_settings.model_dump()

        memory_manager.save_user_context(user_id, request.user_profile, user_settings)

        history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        try:
            response = await agent.chat(
                message=request.message,
                user_profile=request.user_profile,
                settings=user_settings,
                history=history,
            )

            response_text = response.get("response", "")
            if "Error generating response" in response_text and (
                "401" in response_text or
                "api key" in response_text.lower() or
                "invalid_api_key" in response_text.lower()
            ):
                return ChatResponse(
                    response="🔑 Authentication error with AI service.\nPlease check your API key in backend/.env",
                    tokenUsage={"prompt": 0, "completion": 0, "total": 0},
                    metadata={"mock_response": True, "reason": "API key authentication failed"},
                )

            return ChatResponse(
                response=response["response"],
                tokenUsage=response["tokenUsage"],
                metadata=response.get("metadata", {}),
            )

        except Exception as agent_error:
            error_str = str(agent_error)
            if "401" in error_str or "api key" in error_str.lower() or "invalid_api_key" in error_str.lower():
                return ChatResponse(
                    response="🔑 Authentication error with AI service.\nPlease check your API key in backend/.env",
                    tokenUsage={"prompt": 0, "completion": 0, "total": 0},
                    metadata={"mock_response": True, "reason": "API key authentication failed"},
                )
            raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat: {str(e)}",
        )


# ── Settings endpoints ─────────────────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get current settings for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    
    if not user_settings:
        # Return defaults if not found
        return {
            "llm": "openai",
            "temperature": 0.7,
            "topP": 0.9,
            "frequencyPenalty": 0.0,
            "personality": "friendly",
            "enableCache": True,
            "enableTools": True,
            "enabledTools": ["generate_workout_plan", "calculate_nutrition", "analyze_progress", "search_exercises", "track_goals"],
            "theme": "dark",
            "language": "en",
            "units": "metric",
            "notifications": False,
            "enabledAgents": ["health_agent", "fitness_agent", "nutrition_agent", "progress_agent", "supervisor_agent"]
        }
    
    return {
        "llm": user_settings.llm,
        "temperature": user_settings.temperature,
        "topP": user_settings.topP,
        "frequencyPenalty": user_settings.frequencyPenalty,
        "personality": user_settings.personality,
        "enableCache": user_settings.enableCache,
        "enableTools": user_settings.enableTools,
        "enabledTools": user_settings.enabledTools or [],
        "theme": user_settings.theme,
        "language": user_settings.language,
        "units": user_settings.units,
        "notifications": user_settings.notifications,
        "enabledAgents": user_settings.enabledAgents or []
    }


@app.put("/api/settings")
async def update_settings(
    new_settings: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update settings for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    
    if not user_settings:
        user_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=user.id,
            llm=new_settings.get("llm", "openai"),
            temperature=new_settings.get("temperature", 0.7),
            topP=new_settings.get("topP", 0.9),
            frequencyPenalty=new_settings.get("frequencyPenalty", 0.0),
            personality=new_settings.get("personality", "friendly"),
            enableCache=new_settings.get("enableCache", True),
            enableTools=new_settings.get("enableTools", True),
            enabledTools=new_settings.get("enabledTools", []),
            theme=new_settings.get("theme", "dark"),
            language=new_settings.get("language", "en"),
            units=new_settings.get("units", "metric"),
            notifications=new_settings.get("notifications", False),
            enabledAgents=new_settings.get("enabledAgents", [])
        )
        db.add(user_settings)
    else:
        user_settings.llm = new_settings.get("llm", user_settings.llm)
        user_settings.temperature = new_settings.get("temperature", user_settings.temperature)
        user_settings.topP = new_settings.get("topP", user_settings.topP)
        user_settings.frequencyPenalty = new_settings.get("frequencyPenalty", user_settings.frequencyPenalty)
        user_settings.personality = new_settings.get("personality", user_settings.personality)
        user_settings.enableCache = new_settings.get("enableCache", user_settings.enableCache)
        user_settings.enableTools = new_settings.get("enableTools", user_settings.enableTools)
        user_settings.enabledTools = new_settings.get("enabledTools", user_settings.enabledTools)
        user_settings.theme = new_settings.get("theme", user_settings.theme)
        user_settings.language = new_settings.get("language", user_settings.language)
        user_settings.units = new_settings.get("units", user_settings.units)
        user_settings.notifications = new_settings.get("notifications", user_settings.notifications)
        user_settings.enabledAgents = new_settings.get("enabledAgents", user_settings.enabledAgents)
    
    db.commit()
    db.refresh(user_settings)
    
    return {
        "llm": user_settings.llm,
        "temperature": user_settings.temperature,
        "topP": user_settings.topP,
        "frequencyPenalty": user_settings.frequencyPenalty,
        "personality": user_settings.personality,
        "enableCache": user_settings.enableCache,
        "enableTools": user_settings.enableTools,
        "enabledTools": user_settings.enabledTools or [],
        "theme": user_settings.theme,
        "language": user_settings.language,
        "units": user_settings.units,
        "notifications": user_settings.notifications,
        "enabledAgents": user_settings.enabledAgents or []
    }


@app.get("/api/settings/agents")
async def get_agents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get enabled agents for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    
    if not user_settings:
        return {"enabledAgents": ["health_agent", "fitness_agent", "nutrition_agent", "progress_agent", "supervisor_agent"]}
    
    return {"enabledAgents": user_settings.enabledAgents or []}


@app.put("/api/settings/agents")
async def update_agents(
    data: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update enabled agents for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    
    if not user_settings:
        user_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=user.id,
            enabledAgents=data.get("enabledAgents", [])
        )
        db.add(user_settings)
    else:
        user_settings.enabledAgents = data.get("enabledAgents", [])
    
    db.commit()
    db.refresh(user_settings)
    
    return {"enabledAgents": user_settings.enabledAgents or []}


# ── Token Usage endpoints ──────────────────────────────────────────────────────

@app.get("/api/token-usage")
async def get_token_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = 30
) -> Dict[str, Any]:
    """Get token usage stats for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=days)
    
    records = db.query(TokenUsage).filter(
        TokenUsage.user_id == user.id,
        TokenUsage.created_at >= since
    ).all()
    
    total_tokens = sum(r.total_tokens for r in records)
    total_cost = sum(r.cost for r in records)
    total_messages = len(records)
    
    # Group by model
    by_model = {}
    for record in records:
        if record.model not in by_model:
            by_model[record.model] = {"tokens": 0, "cost": 0.0, "messages": 0}
        by_model[record.model]["tokens"] += record.total_tokens
        by_model[record.model]["cost"] += record.cost
        by_model[record.model]["messages"] += 1
    
    history = [{
        "date": r.created_at.isoformat(),
        "model": r.model,
        "promptTokens": r.prompt_tokens,
        "completionTokens": r.completion_tokens,
        "totalTokens": r.total_tokens,
        "cost": r.cost
    } for r in sorted(records, key=lambda x: x.created_at, reverse=True)[:100]]
    
    return {
        "totalTokens": total_tokens,
        "totalCost": total_cost,
        "totalMessages": total_messages,
        "history": history,
        "byModel": by_model
    }


@app.post("/api/token-usage")
async def record_token_usage(
    data: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Record token usage for a chat message"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token_record = TokenUsage(
        id=str(uuid.uuid4()),
        user_id=user.id,
        model=data.get("model", "gpt-4"),
        prompt_tokens=data.get("promptTokens", 0),
        completion_tokens=data.get("completionTokens", 0),
        total_tokens=data.get("totalTokens", 0),
        cost=data.get("cost", 0.0)
    )
    
    db.add(token_record)
    db.commit()
    
    return {"status": "recorded", "id": token_record.id}


@app.delete("/api/token-usage")
async def clear_token_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Clear all token usage history for user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db.query(TokenUsage).filter(TokenUsage.user_id == user.id).delete()
    db.commit()
    
    return {"status": "cleared"}


# ── History endpoints ──────────────────────────────────────────────────────────

@app.get("/api/history")
async def get_history(user_id: Optional[str] = "default") -> Dict[str, Any]:
    """Get chat history for user"""
    history = memory_manager.get_conversation_history(user_id, limit=50)
    return {"messages": history}


@app.delete("/api/history/{message_id}")
async def delete_message(
    message_id: str,
    user_id: Optional[str] = "default"
) -> Dict[str, str]:
    """Delete a specific message from history"""
    return {"status": "deleted", "message_id": message_id}


# ── Feedback endpoint ──────────────────────────────────────────────────────────

@app.post("/api/feedback")
async def submit_feedback(
    feedback: Feedback,
    user_id: Optional[str] = "default"
) -> Dict[str, str]:
    """Submit feedback on a coach response"""
    if user_id not in user_feedback:
        user_feedback[user_id] = []
    user_feedback[user_id].append(feedback.model_dump())
    return {"status": "feedback_recorded", "message_id": feedback.message_id}


# ── Stats endpoints ────────────────────────────────────────────────────────────

@app.get("/api/stats/{user_id}")
async def get_user_stats(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Get user fitness stats"""
    stats = memory_manager.get_stats(user_id, days)
    return {"stats": stats, "count": len(stats)}


@app.post("/api/stats/{user_id}")
async def update_user_stats(user_id: str, stats: Dict[str, Any]) -> Dict[str, str]:
    """Update user fitness stats"""
    memory_manager.update_stats(user_id, stats)
    return {"status": "stats_updated"}


@app.get("/api/context/{user_id}")
async def get_user_context(user_id: str) -> Dict[str, Any]:
    """Get user context for the agent"""
    context = memory_manager.get_context(user_id)
    return context


# ── External API: Weather-Based Exercise Recommendations ──────────────────────

@app.get("/api/weather/exercise-recommendations")
async def get_weather_recommendations(
    latitude: float = 40.7128,
    longitude: float = -74.0060,
    country_code: str = "US"
) -> Dict[str, Any]:
    """
    Get exercise recommendations based on current weather.
    Uses Open-Meteo API (no authentication required).
    
    Example: /api/weather/exercise-recommendations?latitude=40.7128&longitude=-74.0060
    """
    from agent.tools import get_weather_exercise_recommendations
    
    try:
        recommendations = await get_weather_exercise_recommendations(latitude, longitude, country_code)
        return recommendations
    except Exception as e:
        return {
            "error": str(e),
            "message": "Could not fetch weather data"
        }


# ── Response Caching ──────────────────────────────────────────────────────────

@app.get("/api/cache/stats")
async def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    from agent.tools import ResponseCache
    
    stats = ResponseCache.get_stats()
    return {
        "cache": stats,
        "message": "Response caching is enabled for frequently asked questions"
    }


@app.post("/api/cache/clear")
async def clear_cache() -> Dict[str, str]:
    """Clear the response cache"""
    from agent.tools import ResponseCache
    
    ResponseCache._cache.clear()
    return {"status": "cleared", "message": "Cache cleared successfully"}


# ── Feedback Endpoints ────────────────────────────────────────────────────────

@app.post("/api/feedback/submit")
async def submit_response_feedback(
    user_id: str,
    message_id: str,
    rating: int,
    comment: str = "",
    helpful: bool = True,
    tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Submit feedback on an AI response.
    
    Args:
        user_id: User ID giving feedback
        message_id: ID of the message being rated
        rating: 1-5 star rating
        comment: Optional feedback comment
        helpful: Whether the response was helpful
        tags: Tags describing the feedback (e.g., "too_long", "unclear", "perfect")
    """
    from agent.tools import FeedbackCollector
    
    try:
        result = FeedbackCollector.submit_feedback(
            user_id=user_id,
            message_id=message_id,
            rating=rating,
            comment=comment,
            helpful=helpful,
            tags=tags
        )
        return result
    except Exception as e:
        return {"error": str(e), "status": "failed"}


@app.get("/api/feedback/user/{user_id}")
async def get_user_feedback(user_id: str) -> Dict[str, Any]:
    """Get all feedback given by a specific user"""
    from agent.tools import FeedbackCollector
    
    try:
        feedback_summary = FeedbackCollector.get_user_feedback(user_id)
        return feedback_summary
    except Exception as e:
        return {"error": str(e), "user_id": user_id}


@app.get("/api/feedback/insights")
async def get_feedback_insights() -> Dict[str, Any]:
    """Get aggregate feedback insights across all users"""
    from agent.tools import FeedbackCollector
    
    try:
        insights = FeedbackCollector.get_aggregate_insights()
        return insights
    except Exception as e:
        return {"error": str(e), "message": "Could not retrieve insights"}


# ── Error handlers ─────────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = settings.API_PORT
    host = settings.API_HOST
    print(f"\n🏋️  Health Fitness Coach API starting...")
    print(f"🌐 Running on {host}:{port}")
    print(f"📖 API Docs: http://{host}:{port}/docs")
    print(f"📖 ReDoc:    http://{host}:{port}/redoc\n")
    uvicorn.run("api.main:app", host=host, port=port, reload=settings.DEBUG)