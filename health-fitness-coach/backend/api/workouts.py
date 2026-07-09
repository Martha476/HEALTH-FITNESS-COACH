"""Workout templates, exercise demo videos, custom workouts, and ratings."""
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agent.memory import MemoryManager

try:
    from data.workout_templates import WORKOUT_TEMPLATES
except Exception:
    WORKOUT_TEMPLATES = []

try:
    from data.exercise_videos import EXERCISE_VIDEOS
except Exception:
    EXERCISE_VIDEOS = {}

router = APIRouter(prefix="/api/workouts", tags=["workouts"])
memory_manager = MemoryManager()


class CustomWorkout(BaseModel):
    user_id: str
    name: str
    exercises: List[Dict[str, Any]]


class WorkoutRating(BaseModel):
    user_id: str
    workout_id: str
    rating: int = Field(ge=1, le=5)
    notes: Optional[str] = ""


@router.get("/templates")
async def list_templates() -> Dict[str, Any]:
    return {"templates": WORKOUT_TEMPLATES, "count": len(WORKOUT_TEMPLATES)}


@router.get("/videos")
async def list_videos() -> Dict[str, Any]:
    return {"videos": EXERCISE_VIDEOS, "count": len(EXERCISE_VIDEOS)}


@router.get("/videos/{exercise}")
async def get_video(exercise: str) -> Dict[str, Any]:
    key = exercise.lower().strip()
    if key not in EXERCISE_VIDEOS:
        raise HTTPException(status_code=404, detail=f"No video for '{exercise}'")
    return {"exercise": key, "video": EXERCISE_VIDEOS[key]}


@router.post("/custom")
async def save_custom_workout(workout: CustomWorkout) -> Dict[str, Any]:
    record = {
        "id": str(uuid.uuid4()),
        "name": workout.name,
        "exercises": workout.exercises,
        "created_at": datetime.utcnow().isoformat(),
    }
    data = memory_manager._get(workout.user_id)
    data.setdefault("custom_workouts", []).append(record)
    memory_manager._persist(workout.user_id)
    return {"status": "saved", "workout": record}


@router.get("/custom/{user_id}")
async def list_custom_workouts(user_id: str) -> Dict[str, Any]:
    data = memory_manager._get(user_id)
    return {"workouts": data.get("custom_workouts", [])}


@router.delete("/custom/{user_id}/{workout_id}")
async def delete_custom_workout(user_id: str, workout_id: str) -> Dict[str, str]:
    data = memory_manager._get(user_id)
    before = len(data.get("custom_workouts", []))
    data["custom_workouts"] = [w for w in data.get("custom_workouts", []) if w.get("id") != workout_id]
    if len(data["custom_workouts"]) == before:
        raise HTTPException(status_code=404, detail="Workout not found")
    memory_manager._persist(user_id)
    return {"status": "deleted"}


@router.post("/ratings")
async def submit_rating(rating: WorkoutRating) -> Dict[str, Any]:
    record = {
        "workout_id": rating.workout_id,
        "rating": rating.rating,
        "notes": rating.notes,
        "logged_at": datetime.utcnow().isoformat(),
    }
    data = memory_manager._get(rating.user_id)
    data.setdefault("workout_ratings", []).append(record)

    if rating.rating >= 4 or rating.rating <= 2:
        verdict = "loved" if rating.rating >= 4 else "disliked"
        fact = f"User {verdict} workout '{rating.workout_id}' (rated {rating.rating}/5)"
        if rating.notes:
            fact += f": {rating.notes}"
        data.setdefault("long_term_facts", []).append({
            "fact": fact, "added_at": datetime.utcnow().isoformat()
        })

    memory_manager._persist(rating.user_id)
    return {"status": "rated", "rating": record}


@router.get("/ratings/{user_id}")
async def list_ratings(user_id: str) -> Dict[str, Any]:
    data = memory_manager._get(user_id)
    ratings = data.get("workout_ratings", [])
    avg = round(sum(r.get("rating", 0) for r in ratings) / len(ratings), 1) if ratings else 0
    return {"ratings": ratings, "count": len(ratings), "average": avg}