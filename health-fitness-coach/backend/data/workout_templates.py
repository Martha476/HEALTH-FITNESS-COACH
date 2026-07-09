"""
Workout template library — preset routines users can pick from.

Each template can include supersets/circuits via the optional
"group_id" + "group_type" fields on exercises. Exercises sharing
a group_id are performed together as a superset (alternating) or
a circuit (all in sequence).
"""

WORKOUT_TEMPLATES = [
    {
        "id": "30-day-beginner",
        "name": "30-Day Beginner",
        "category": "beginner",
        "duration_weeks": 4,
        "days_per_week": 3,
        "description": "A gentle on-ramp for new lifters. Full-body, mostly bodyweight.",
        "tags": ["beginner", "bodyweight", "full-body"],
        "days": [
            {
                "day": "Day A",
                "focus": "Full body",
                "exercises": [
                    {"name": "Bodyweight Squat",   "sets": 3, "reps": "12", "rest_seconds": 60},
                    {"name": "Push-ups",           "sets": 3, "reps": "8-10", "rest_seconds": 60},
                    {"name": "Bent Over Rows",     "sets": 3, "reps": "10",  "rest_seconds": 60, "weight": "light"},
                    {"name": "Plank",              "sets": 3, "reps": "30s", "rest_seconds": 45},
                ],
            },
            {
                "day": "Day B",
                "focus": "Lower + core",
                "exercises": [
                    {"name": "Goblet Squat",       "sets": 3, "reps": "10", "rest_seconds": 75},
                    {"name": "Glute Bridge",       "sets": 3, "reps": "15", "rest_seconds": 60},
                    {"name": "Mountain Climbers",  "sets": 3, "reps": "20", "rest_seconds": 45},
                    {"name": "Plank",              "sets": 3, "reps": "30s", "rest_seconds": 45},
                ],
            },
        ],
    },
    {
        "id": "5x5-strength",
        "name": "5x5 Strength",
        "category": "strength",
        "duration_weeks": 12,
        "days_per_week": 3,
        "description": "Classic linear-progression powerlifting program. Big compounds, low reps.",
        "tags": ["strength", "barbell", "intermediate"],
        "days": [
            {
                "day": "Workout A",
                "focus": "Squat focus",
                "exercises": [
                    {"name": "Barbell Squat",   "sets": 5, "reps": "5", "rest_seconds": 180},
                    {"name": "Bench Press",     "sets": 5, "reps": "5", "rest_seconds": 180},
                    {"name": "Bent Over Rows",  "sets": 5, "reps": "5", "rest_seconds": 180},
                ],
            },
            {
                "day": "Workout B",
                "focus": "Deadlift focus",
                "exercises": [
                    {"name": "Barbell Squat",   "sets": 5, "reps": "5", "rest_seconds": 180},
                    {"name": "Overhead Press",  "sets": 5, "reps": "5", "rest_seconds": 180},
                    {"name": "Deadlift",        "sets": 1, "reps": "5", "rest_seconds": 240},
                ],
            },
        ],
    },
    {
        "id": "hiit-cardio",
        "name": "HIIT Cardio Burner",
        "category": "fat-loss",
        "duration_weeks": 6,
        "days_per_week": 4,
        "description": "20-minute high-intensity intervals for fat loss and conditioning.",
        "tags": ["hiit", "cardio", "fat-loss", "bodyweight"],
        "days": [
            {
                "day": "Circuit Day",
                "focus": "Full-body conditioning",
                "exercises": [
                    {"name": "Burpees",          "sets": 4, "reps": "15", "rest_seconds": 30, "group_id": "c1", "group_type": "circuit"},
                    {"name": "Mountain Climbers","sets": 4, "reps": "30", "rest_seconds": 30, "group_id": "c1", "group_type": "circuit"},
                    {"name": "Jump Squats",      "sets": 4, "reps": "20", "rest_seconds": 30, "group_id": "c1", "group_type": "circuit"},
                    {"name": "High Knees",       "sets": 4, "reps": "40", "rest_seconds": 60, "group_id": "c1", "group_type": "circuit"},
                ],
            },
        ],
    },
    {
        "id": "upper-lower-hypertrophy",
        "name": "Upper/Lower Hypertrophy",
        "category": "muscle-gain",
        "duration_weeks": 8,
        "days_per_week": 4,
        "description": "Classic 4-day upper/lower split with antagonist supersets for muscle growth.",
        "tags": ["hypertrophy", "muscle-gain", "intermediate"],
        "days": [
            {
                "day": "Upper",
                "focus": "Chest + Back (supersets)",
                "exercises": [
                    {"name": "Barbell Bench Press", "sets": 4, "reps": "8",  "rest_seconds": 90, "group_id": "ss1", "group_type": "superset"},
                    {"name": "Bent Over Rows",      "sets": 4, "reps": "8",  "rest_seconds": 90, "group_id": "ss1", "group_type": "superset"},
                    {"name": "Incline Dumbbell Press","sets": 3,"reps": "10","rest_seconds": 75, "group_id": "ss2", "group_type": "superset"},
                    {"name": "Pull-ups",            "sets": 3, "reps": "10", "rest_seconds": 75, "group_id": "ss2", "group_type": "superset"},
                    {"name": "Lateral Raises",      "sets": 3, "reps": "12", "rest_seconds": 60},
                ],
            },
            {
                "day": "Lower",
                "focus": "Quads + Hamstrings",
                "exercises": [
                    {"name": "Barbell Squat", "sets": 4, "reps": "8",  "rest_seconds": 120},
                    {"name": "Deadlift",      "sets": 3, "reps": "6",  "rest_seconds": 180},
                    {"name": "Glute Bridge",  "sets": 3, "reps": "12", "rest_seconds": 75},
                ],
            },
        ],
    },
]


def list_templates(category: str | None = None):
    if not category:
        return WORKOUT_TEMPLATES
    return [t for t in WORKOUT_TEMPLATES if t["category"] == category]


def get_template(template_id: str):
    for t in WORKOUT_TEMPLATES:
        if t["id"] == template_id:
            return t
    return None