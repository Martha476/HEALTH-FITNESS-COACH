"""
Exercise video endpoints — live YouTube search scoped to the user's fitness goal.
"""

import logging
from fastapi import APIRouter, Depends, Query

from api.auth import get_current_user
from tools.youtube_search import search_exercise_videos

logger = logging.getLogger(__name__)

router = APIRouter()

# Maps every goal string your frontend/profile might produce
# to the goal keys youtube_search.py understands.
GOAL_TO_SEARCH_KEY = {
    # muscle gain
    "muscle-gain":            "muscle_gain",
    "muscle gain":            "muscle_gain",
    "build-muscle":           "muscle_gain",
    "build muscle":           "muscle_gain",
    "muscle-building":        "muscle_gain",
    "strength":               "muscle_gain",
    "strength-training":      "muscle_gain",
    "strength training":      "muscle_gain",
    "lower-body-strength":    "muscle_gain",
    "glute-strength":         "muscle_gain",
    "core-strength":          "core_strength",
    "core strength":          "core_strength",

    # fat loss
    "fat-loss":                "weight_loss",
    "fat loss":                "weight_loss",
    "weight-loss":             "weight_loss",
    "weight loss":             "weight_loss",
    "lose-weight":             "weight_loss",

    # endurance / cardio
    "endurance":                "endurance",
    "improve-endurance":        "endurance",
    "cardio":                   "cardio",
    "cardiovascular health":    "cardio",
    "stay active":              "cardio",
    "stay active / maintain":   "cardio",

    # flexibility / mobility
    "flexibility":              "flexibility",
    "improve-flexibility":      "flexibility",
    "mobility":                 "hip_mobility",
    "hip-mobility":             "hip_mobility",
    "hip mobility":             "hip_mobility",
    "stress relief":            "flexibility",
    "better sleep":             "flexibility",
}


def _normalize_goal(raw_goal: str) -> str:
    """Map any raw profile/UI goal string to a youtube_search.py goal key."""
    key = (raw_goal or "").strip().lower()
    return GOAL_TO_SEARCH_KEY.get(key, "general")


@router.get("/api/exercises/videos")
async def get_exercise_videos(
    goal: str = Query("general", description="User's fitness goal, raw or normalized"),
    exercise: str = Query("", description="Optional specific exercise name"),
    current_user: dict = Depends(get_current_user),
):
    """
    Live YouTube search for exercise demo videos, strictly scoped to
    the user's fitness goal. No static fallback list — if YouTube
    returns nothing, the frontend should show an empty state.
    """
    normalized_goal = _normalize_goal(goal)
    logger.info(
        "Exercise video search — user=%s raw_goal=%r normalized_goal=%r exercise=%r",
        current_user.get("id"), goal, normalized_goal, exercise,
    )

    result = search_exercise_videos(fitness_goal=normalized_goal, exercise_name=exercise)

    if result.get("error"):
        logger.warning("YouTube search failed: %s", result["error"])

    return {
        "videos": result.get("videos", []),
        "query": result.get("query", ""),
        "goal": goal,
        "normalized_goal": normalized_goal,
        "error": result.get("error"),
    }