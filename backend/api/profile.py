from fastapi import APIRouter, Depends, HTTPException, Request
from api.auth import get_current_user, get_supabase
from datetime import datetime

router = APIRouter()


def _normalize_profile(user: dict) -> dict:
    """Map Supabase user row to frontend profile shape."""
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "age": user.get("age"),
        "gender": user.get("gender"),
        "height": user.get("height"),
        "currentWeight": user.get("currentWeight") or user.get("current_weight") or user.get("weight_lbs"),
        "startWeight": user.get("startWeight") or user.get("start_weight"),
        "targetWeight": user.get("targetWeight") or user.get("target_weight"),
        "primaryGoal": user.get("primaryGoal") or user.get("primary_goal") or user.get("fitness_level"),
        "activityLevel": user.get("activityLevel") or user.get("activity_level"),
        "experienceLevel": user.get("experienceLevel") or user.get("experience_level"),
        "preferredUnit": user.get("preferredUnit") or user.get("preferred_unit"),
        "dailyCalorieGoal": user.get("dailyCalorieGoal") or user.get("daily_calorie_goal"),
        "dietaryType": user.get("dietaryType") or user.get("dietary_type"),
        "injuries": user.get("injuries"),
        "medicalConditions": user.get("medicalConditions") or user.get("medical_conditions"),
    }


@router.get("/api/profile/{user_id}")
async def get_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get user profile from Supabase."""
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's profile")

    supabase = get_supabase()
    try:
        res = supabase.table("users").select("*").eq("id", user_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User not found")
        return _normalize_profile(res.data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {str(e)}") from e


@router.put("/api/profile/{user_id}")
async def update_profile(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Update user profile in Supabase."""
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")

    data = await request.json()
    data["updated_at"] = datetime.utcnow().isoformat()

    supabase = get_supabase()
    try:
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "Profile updated successfully", "profile": _normalize_profile(result.data[0])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}") from e
