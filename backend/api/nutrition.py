from typing import Dict, Any, List, Optional
from datetime import datetime
import base64
import uuid
import os

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
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

class MealAnalysisResult(BaseModel):
    food_name: str
    confidence: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    serving_size_grams: float
    description: str
    portion_estimate: str

# --- Helper Functions ---

async def analyze_meal_with_vision(image_uri: str, meal_type: str) -> MealAnalysisResult:
    """
    Call Claude Vision API to analyze the meal image.
    """
    import anthropic
    import json
    import re
    
    try:
        client = anthropic.Anthropic()
        
        prompt = f"""Analyze this meal image for nutritional information. Identify:
1. What foods are visible
2. Estimated portion sizes
3. Approximate calories per 100g (if applicable)
4. Estimated macros (protein, carbs, fats)

For a {meal_type}, provide your best estimates based on typical serving sizes.

Return response in this JSON format:
{{
    "food_name": "description of the meal",
    "confidence": 0.85,
    "calories": 450,
    "protein_g": 25,
    "carbs_g": 45,
    "fat_g": 12,
    "serving_size_grams": 350,
    "description": "detailed description of what you see",
    "portion_estimate": "estimated serving size"
}}"""
        
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_uri.split(",")[1] if "," in image_uri else image_uri,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ],
                }
            ],
        )
        
        # Parse the response
        response_text = message.content[0].text
        
        # Extract JSON from the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result_dict = json.loads(json_match.group())
            return MealAnalysisResult(**result_dict)
        else:
            # Fallback if JSON extraction fails
            return MealAnalysisResult(
                food_name="Unknown meal",
                confidence=0.5,
                calories=300,
                protein_g=15,
                carbs_g=40,
                fat_g=10,
                serving_size_grams=200,
                description="Unable to analyze - using fallback values",
                portion_estimate="estimated"
            )
    
    except Exception as e:
        # Return fallback values on error
        return MealAnalysisResult(
            food_name="Meal analysis failed",
            confidence=0.3,
            calories=250,
            protein_g=10,
            carbs_g=30,
            fat_g=8,
            serving_size_grams=150,
            description=f"Analysis error: {str(e)}",
            portion_estimate="fallback"
        )

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

@router.post("/meals/analyze-image")
async def analyze_meal_image(
    file: UploadFile = File(...),
    user_id: str = None,
    meal_type: str = "lunch",
) -> Dict[str, Any]:
    """
    Analyze a meal image to extract food items and nutritional information.
    Uses Claude Vision API to identify foods and estimate calories/macros.
    """
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Encode image as base64
        image_base64 = base64.standard_b64encode(contents).decode("utf-8")
        
        # Determine file type for data URI
        file_type = file.content_type or "image/jpeg"
        data_uri = f"data:{file_type};base64,{image_base64}"
        
        # Analyze using Claude Vision API
        analysis_result = await analyze_meal_with_vision(data_uri, meal_type)
        
        return {
            "status": "success",
            "analysis": analysis_result.model_dump()
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze meal image: {str(e)}"
        )