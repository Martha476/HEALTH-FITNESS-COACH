from typing import Dict, Any, List, Optional
from datetime import datetime, date
import uuid
import base64
import json
import os

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from agent.memory import MemoryManager

router = APIRouter(prefix="/api/nutrition/meals", tags=["meals"])
memory_manager = MemoryManager()

class MealLogEntry(BaseModel):
    user_id: str
    name: str
    brand: Optional[str] = None
    image: Optional[str] = None
    serving_g: float = Field(default=100.0, ge=0.1, le=5000.0)
    meal_type: str = Field(default="snack", pattern="^(breakfast|lunch|dinner|snack)$")
    calories_100g: float = 0.0
    protein_100g: float = 0.0
    carbs_100g: float = 0.0
    fat_100g: float = 0.0

def _scaled(per100, grams):
    return round((per100) * grams / 100.0, 1)

def _get_daily_log(user_id, day_iso=None):
    if not day_iso:
        day_iso = date.today().isoformat()
    user_data = memory_manager.get_context(user_id) or {}
    meals_log = user_data.get("meals_log", [])
    return [e for e in meals_log if e.get("logged_at", "").startswith(day_iso)]

def _calculate_totals(entries):
    return {
        "calories": round(sum(e.get("calories", 0) for e in entries), 1),
        "protein_g": round(sum(e.get("protein_g", 0) for e in entries), 1),
        "carbs_g": round(sum(e.get("carbs_g", 0) for e in entries), 1),
        "fat_g": round(sum(e.get("fat_g", 0) for e in entries), 1),
    }

def encode_image_to_base64(image_data):
    return base64.b64encode(image_data).decode('utf-8')

async def analyze_meal_image_with_ai(image_base64, user_notes=None):
    import openai
    from dotenv import load_dotenv
    from pathlib import Path
    
    for candidate in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path(".env"),
    ]:
        if candidate.exists():
            load_dotenv(candidate, override=False)
            break
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI image analysis not available - OPENAI_API_KEY not configured")
    
    client = openai.OpenAI(api_key=api_key)
    
    system_prompt = """You are a professional nutritionist and food analyst.
Analyze the provided image of a meal and estimate its nutritional content.
Be accurate and conservative.
Return ONLY a valid JSON object with these fields:
{
  "food_name": "descriptive name",
  "confidence": 0.0-1.0,
  "calories": 0,
  "protein_g": 0.0,
  "carbs_g": 0.0,
  "fat_g": 0.0,
  "serving_size_grams": 0,
  "description": "brief description",
  "portion_estimate": "small/medium/large"
}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": f"Analyze this meal. {user_notes or ''}"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}", "detail": "high"}}
                ]}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        if content:
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                raise HTTPException(status_code=500, detail="Failed to parse AI response")
        raise HTTPException(status_code=500, detail="No AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/log", status_code=201)
async def log_meal(entry: MealLogEntry):
    record = {
        "id": str(uuid.uuid4()),
        "name": entry.name,
        "brand": entry.brand,
        "image": entry.image,
        "serving_g": entry.serving_g,
        "meal_type": entry.meal_type,
        "calories": _scaled(entry.calories_100g, entry.serving_g),
        "protein_g": _scaled(entry.protein_100g, entry.serving_g),
        "carbs_g": _scaled(entry.carbs_100g, entry.serving_g),
        "fat_g": _scaled(entry.fat_100g, entry.serving_g),
        "logged_at": datetime.utcnow().isoformat(),
    }
    data = memory_manager.get_context(entry.user_id) or {}
    data.setdefault("meals_log", []).append(record)
    memory_manager.save_user_context(entry.user_id, data, None)
    current_entries = _get_daily_log(entry.user_id)
    return {"status": "success", "entry": record, "totals": _calculate_totals(current_entries)}

@router.post("/analyze-image")
async def analyze_meal_image_endpoint(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    meal_type: str = Form(default="snack", pattern="^(breakfast|lunch|dinner|snack)$"),
    user_notes: Optional[str] = Form(None)
):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size must be less than 10MB")
    image_base64 = encode_image_to_base64(image_bytes)
    analysis = await analyze_meal_image_with_ai(image_base64, user_notes)
    return {"status": "success", "analysis": analysis, "meal_type": meal_type, "image_preview": image_base64}

@router.get("/today/{user_id}")
async def get_today(user_id: str):
    entries = _get_daily_log(user_id)
    by_meal = {"breakfast": [], "lunch": [], "dinner": [], "snack": []}
    for e in entries:
        m_type = e.get("meal_type", "snack")
        if m_type in by_meal:
            by_meal[m_type].append(e)
        else:
            by_meal.setdefault("snack", []).append(e)
    return {"date": date.today().isoformat(), "totals": _calculate_totals(entries), "by_meal": by_meal, "count": len(entries)}

@router.delete("/{user_id}/{entry_id}")
async def delete_entry(user_id: str, entry_id: str):
    data = memory_manager.get_context(user_id) or {}
    log = data.get("meals_log", [])
    updated_log = [e for e in log if e.get("id") != entry_id]
    if len(updated_log) == len(log):
        raise HTTPException(status_code=404, detail="Meal entry not found")
    data["meals_log"] = updated_log
    memory_manager.save_user_context(user_id, data, None)
    remaining_today = _get_daily_log(user_id)
    return {"status": "deleted", "totals": _calculate_totals(remaining_today)}

@router.delete("/{user_id}/today/clear")
async def clear_today(user_id: str):
    data = memory_manager.get_context(user_id) or {}
    today = date.today().isoformat()
    data["meals_log"] = [e for e in data.get("meals_log", []) if not e.get("logged_at", "").startswith(today)]
    memory_manager.save_user_context(user_id, data, None)
    return {"status": "cleared", "totals": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}}
