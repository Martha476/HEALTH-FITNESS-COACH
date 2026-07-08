"""
Exercise demo video library.

Maps normalized exercise names to YouTube video IDs.
The frontend renders an <iframe> at https://www.youtube.com/embed/<id>.
Add more entries as you expand your exercise database.
"""

EXERCISE_VIDEOS = {
    "barbell bench press":    {"youtube_id": "rT7DgCr-3pg", "duration_sec": 60},
    "incline dumbbell press": {"youtube_id": "8iPEnn-ltC8", "duration_sec": 45},
    "cable flyes":            {"youtube_id": "Iwe6AmxVf7o", "duration_sec": 50},
    "bent over rows":         {"youtube_id": "vT2GjY_Umpw", "duration_sec": 55},
    "pull-ups":               {"youtube_id": "eGo4IYlbE5g", "duration_sec": 40},
    "overhead press":         {"youtube_id": "2yjwXTZQDDI", "duration_sec": 50},
    "lateral raises":         {"youtube_id": "3VcKaXpzqRo", "duration_sec": 40},
    "burpees":                {"youtube_id": "TU8QYVW0gDU", "duration_sec": 35},
    "mountain climbers":      {"youtube_id": "nmwgirgXLYM", "duration_sec": 30},
    "jump squats":            {"youtube_id": "U4s4mEQ5VqU", "duration_sec": 40},
    "push-ups":               {"youtube_id": "IODxDxX7oi4", "duration_sec": 45},
    "high knees":             {"youtube_id": "8opcQdC-V-U", "duration_sec": 30},
    "plank":                  {"youtube_id": "ASdvN_XEl_c", "duration_sec": 35},
    "jump rope":              {"youtube_id": "FJmRQ5iTXKE", "duration_sec": 40},
    "barbell squat":          {"youtube_id": "ultWZbUMPL8", "duration_sec": 60},
    "deadlift":               {"youtube_id": "op9kVnSso6Q", "duration_sec": 60},
    "bench press":            {"youtube_id": "rT7DgCr-3pg", "duration_sec": 60},
}


def get_video(exercise_name: str):
    """Return the demo video info for an exercise, or None."""
    if not exercise_name:
        return None
    return EXERCISE_VIDEOS.get(exercise_name.strip().lower())