"""
Weekly planners and proactive suggestions.

These functions use the existing LLM (via initialize_llm) to produce
structured weekly workout / meal plans, plus a rule-based proactive
suggestion that reads from MemoryManager.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import json

from langchain_core.messages import SystemMessage, HumanMessage


WORKOUT_PLAN_PROMPT = """You are a certified fitness coach. Generate a personalized 7-day workout plan as STRICT JSON.

Rules:
- Match the user's fitness level, primary goal, available equipment, days/week, and injuries.
- Skip exercises that aggravate any listed injuries.
- Every TRAINING day MUST list exercises with: name, sets, reps, rest_seconds, notes.
- REST days MUST be marked with "rest": true and a short recovery suggestion.
- Total training days MUST equal the user's workout_days_per_week (rest of week is rest/active recovery).

Return ONLY this JSON object (no markdown fences, no commentary):
{
  "plan_name": "...",
  "weekly_focus": "...",
  "estimated_calories_per_session": 0,
  "days": [
    {
      "day": "Monday",
      "title": "...",
      "rest": false,
      "duration_min": 0,
      "warmup": "...",
      "exercises": [
        {"name": "...", "sets": 0, "reps": "...", "rest_seconds": 0, "notes": "..."}
      ],
      "cooldown": "..."
    }
  ],
  "progression_notes": "..."
}"""

MEAL_PLAN_PROMPT = """You are a certified nutritionist. Generate a 7-day meal plan as STRICT JSON.

Rules:
- Hit the user's daily calorie target within +/- 100 kcal/day.
- Respect dietary_type and food_allergies. NEVER include any allergen.
- Each day has breakfast, lunch, dinner, plus 1 to 2 snacks.
- Provide a consolidated weekly shopping list.

Return ONLY this JSON object (no markdown fences, no commentary):
{
  "plan_name": "...",
  "daily_target_calories": 0,
  "daily_macros": {"protein_g": 0, "carbs_g": 0, "fat_g": 0},
  "days": [
    {
      "day": "Monday",
      "total_calories": 0,
      "meals": [
        {
          "meal": "Breakfast",
          "name": "...",
          "calories": 0,
          "protein_g": 0,
          "carbs_g": 0,
          "fat_g": 0,
          "ingredients": ["..."],
          "prep_minutes": 0
        }
      ]
    }
  ],
  "shopping_list": ["..."],
  "tips": ["..."]
}"""


def _parse_json_response(text: str, kind: str) -> Dict[str, Any]:
    """Robustly extract a JSON object from an LLM response, even if it's wrapped in markdown."""
    if not text:
        raise ValueError(f"Empty response from LLM for {kind} plan")
    s = text.strip()
    if s.startswith("```"):
        s = s.split("```", 2)[1] if "```" in s[3:] else s[3:]
        if s.lstrip().lower().startswith("json"):
            s = s.lstrip()[4:]
        if "```" in s:
            s = s.split("```", 1)[0]
    s = s.strip()
    try:
        return json.loads(s)
    except Exception as e:
        start = s.find("{")
        end = s.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(s[start:end + 1])
            except Exception:
                pass
        raise ValueError(f"LLM did not return valid JSON for {kind} plan: {e}")


async def generate_weekly_workout_plan(profile: Dict[str, Any], llm) -> Dict[str, Any]:
    profile_text = json.dumps(profile, indent=2, default=str)
    response = llm.invoke([
        SystemMessage(content=WORKOUT_PLAN_PROMPT),
        HumanMessage(content=f"User profile:\n{profile_text}\n\nGenerate the weekly workout plan now."),
    ])
    return _parse_json_response(getattr(response, "content", str(response)), kind="workout")


async def generate_weekly_meal_plan(profile: Dict[str, Any], llm) -> Dict[str, Any]:
    profile_text = json.dumps(profile, indent=2, default=str)
    response = llm.invoke([
        SystemMessage(content=MEAL_PLAN_PROMPT),
        HumanMessage(content=f"User profile:\n{profile_text}\n\nGenerate the weekly meal plan now."),
    ])
    return _parse_json_response(getattr(response, "content", str(response)), kind="meal")


def get_proactive_suggestion(
    user_id: str,
    memory_manager,
    profile: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Return a suggestion dict for the dashboard / chat, or None."""
    profile = profile or {}
    last_workout = memory_manager.get_last_workout_date(user_id)