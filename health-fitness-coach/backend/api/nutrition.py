from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from agent.memory import MemoryManager

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])
memory_manager = MemoryManager()

# --- Schemas ---

class NutritionGoals(BaseModel):
    daily_calorie_target: int = Field(default=2000, ge=1200, le=5000)
    protein_target_g: float = Field(default=150.0, ge=0)
    carbs_target_g: float = Field(default=200.0, ge=0)
    fat_target_g: float = Field(default=65.0, ge=0)
    water_target_oz: float = Field(default=64.0, ge=0)

class NutritionSummary(BaseModel):
    date: str
    consumed: Dict[str, float]
    remaining: Dict[str, float]
    goals: Dict[str, float]
    percentage_complete: float

# --- Endpoints ---

@router.get("/goals/{user_id}")
async def get_nutrition_goals(user_id: str) -> Dict[str, Any]:
    """Retrieve the user's set nutrition targets."""
    context = memory_manager.get_context(user_id)
    # Pull goals from the 'profile' or 'settings' key
    goals = context.get("profile", {}).get("nutrition_goals")
    
    if not goals:
        # Return defaults if nothing is set
        return NutritionGoals().model_dump()
    return goals

@router.put("/goals/{user_id}")
async def update_nutrition_goals(user_id: str, goals: NutritionGoals) -> Dict[str, Any]:
    """Update and persist nutrition targets."""
    context = memory_manager.get_context(user_id)
    
    # Update the nutrition_goals specifically within the profile
    if "profile" not in context:
        context["profile"] = {}
    
    context["profile"]["nutrition_goals"] = goals.model_dump()
    
    # Persist via MemoryManager
    memory_manager.save_user_context(user_id, {"profile": context["profile"]})
    
    return {"status": "goals_updated", "goals": context["profile"]["nutrition_goals"]}

@router.get("/summary/{user_id}")
async def get_nutrition_summary(user_id: str) -> Dict[str, Any]:
    """
    Combines goals from this file with actual logs from meals_log.py 
    to show a dashboard summary.
    """
    context = memory_manager.get_context(user_id)
    
    # 1. Get Goals
    goals = context.get("profile", {}).get("nutrition_goals", NutritionGoals().model_dump())
    
    # 2. Get Today's Logs (Logic mirrored from meals_log.py)
    today = datetime.utcnow().date().isoformat()
    meals = context.get("meals_log", [])
    today_meals = [m for m in meals if m.get("logged_at", "").startswith(today)]
    
    # 3. Calculate Totals
    consumed = {
        "calories": sum(m.get("calories", 0) for m in today_meals),
        "protein": sum(m.get("protein_g", 0) for m in today_meals),
        "carbs": sum(m.get("carbs_g", 0) for m in today_meals),
        "fat": sum(m.get("fat_g", 0) for m in today_meals),
    }
    
    # 4. Calculate Remaining
    target_cal = goals.get("daily_calorie_target", 2000)
    remaining = {
        "calories": max(0, target_cal - consumed["calories"]),
        "protein": max(0, goals.get("protein_target_g", 0) - consumed["protein"]),
        "carbs": max(0, goals.get("carbs_target_g", 0) - consumed["carbs"]),
        "fat": max(0, goals.get("fat_target_g", 0) - consumed["fat"]),
    }

    return {
        "date": today,
        "goals": goals,
        "consumed": consumed,
        "remaining": remaining,
        "progress_percent": round((consumed["calories"] / target_cal) * 100, 1) if target_cal > 0 else 0
    }