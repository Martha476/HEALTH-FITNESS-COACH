# backend/tools/youtube_search.py

import os
import requests
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEO_URL = "https://www.googleapis.com/youtube/v3/videos"

GOAL_SEARCH_TERMS = {
    "weight_loss": "fat burning workout exercise demonstration",
    "muscle_gain": "strength training exercise demonstration",
    "flexibility": "flexibility stretching exercise demonstration",
    "hip_mobility": "hip mobility exercise demonstration",
    "mobility": "mobility exercise demonstration",
    "cardio": "cardio workout exercise demonstration",
    "core_strength": "core strength exercise demonstration",
    "lower_body_strength": "lower body strength exercise demonstration",
    "upper_body_strength": "upper body strength exercise demonstration",
    "full_body": "full body workout exercise demonstration",
    "general": "fitness exercise demonstration",
}

# Fallback static videos in case YouTube API fails
FALLBACK_VIDEOS = {
    "hip_mobility": [
        {"youtube_id": "i1Dl_WBxI8o", "title": "Hip Mobility Exercises", "thumbnail": "https://img.youtube.com/vi/i1Dl_WBxI8o/mqdefault.jpg", "channel": "Fitness Demo", "description": "Hip mobility exercises for better movement"},
        {"youtube_id": "0SMEsZ7tJkQ", "title": "Hip Stretching Routine", "thumbnail": "https://img.youtube.com/vi/0SMEsZ7tJkQ/mqdefault.jpg", "channel": "Fitness Demo", "description": "Daily hip stretching routine"},
        {"youtube_id": "yhJQVXDJoK0", "title": "Hip Flexor Stretch", "thumbnail": "https://img.youtube.com/vi/yhJQVXDJoK0/mqdefault.jpg", "channel": "Fitness Demo", "description": "Hip flexor stretching exercises"},
    ],
    "flexibility": [
        {"youtube_id": "M2Q8gKTNxKI", "title": "Full Body Stretching Routine", "thumbnail": "https://img.youtube.com/vi/M2Q8gKTNxKI/mqdefault.jpg", "channel": "Fitness Demo", "description": "Complete flexibility workout"},
        {"youtube_id": "fUBnT3Tmc50", "title": "Dynamic Stretching", "thumbnail": "https://img.youtube.com/vi/fUBnT3Tmc50/mqdefault.jpg", "channel": "Fitness Demo", "description": "Dynamic stretching exercises"},
    ],
    "muscle_gain": [
        {"youtube_id": "R0X-wfYkRYY", "title": "Full Body Strength Training", "thumbnail": "https://img.youtube.com/vi/R0X-wfYkRYY/mqdefault.jpg", "channel": "Fitness Demo", "description": "Strength training for muscle gain"},
        {"youtube_id": "UyR0bPNBw2w", "title": "Upper Body Workout", "thumbnail": "https://img.youtube.com/vi/UyR0bPNBw2w/mqdefault.jpg", "channel": "Fitness Demo", "description": "Upper body muscle building"},
    ],
    "general": [
        {"youtube_id": "IODxDxX7oi4", "title": "Push-ups - Perfect Form", "thumbnail": "https://img.youtube.com/vi/IODxDxX7oi4/mqdefault.jpg", "channel": "Fitness Demo", "description": "Proper push-up technique"},
        {"youtube_id": "ultWZbUMPL8", "title": "Squat - Perfect Form", "thumbnail": "https://img.youtube.com/vi/ultWZbUMPL8/mqdefault.jpg", "channel": "Fitness Demo", "description": "Proper squat technique"},
    ]
}

def get_video_duration(video_id: str) -> int:
    """Get video duration in seconds using YouTube API."""
    if not YOUTUBE_API_KEY:
        return 45
    
    try:
        response = requests.get(
            YOUTUBE_VIDEO_URL,
            params={
                "part": "contentDetails",
                "id": video_id,
                "key": YOUTUBE_API_KEY,
            },
            timeout=5,
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("items"):
                duration_str = data["items"][0]["contentDetails"]["duration"]
                # Parse ISO 8601 duration
                import re
                match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
                if match:
                    hours = int(match.group(1) or 0)
                    minutes = int(match.group(2) or 0)
                    seconds = int(match.group(3) or 0)
                    return hours * 3600 + minutes * 60 + seconds
    except Exception:
        pass
    return 45


def search_exercise_videos(fitness_goal: str, exercise_name: str = "") -> dict:
    """
    Search YouTube for exercise demo videos matching the user's fitness goal.
    Returns fallback videos if API fails.
    """
    # Normalize goal
    goal_key = fitness_goal.lower().replace(" ", "_")
    
    # Get search term for the goal
    goal_term = GOAL_SEARCH_TERMS.get(goal_key, "fitness exercise demonstration")
    
    # Build query
    if exercise_name:
        query = f"{exercise_name} {goal_term}"
    else:
        query = goal_term
    
    logger.info(f"Searching YouTube for: {query}")
    
    # Try YouTube API first
    if YOUTUBE_API_KEY:
        try:
            response = requests.get(
                YOUTUBE_SEARCH_URL,
                params={
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "maxResults": 8,
                    "videoDuration": "short",
                    "relevanceLanguage": "en",
                    "safeSearch": "strict",
                    "key": YOUTUBE_API_KEY,
                },
                timeout=10,
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for API errors
                if "error" in data:
                    logger.warning(f"YouTube API error: {data['error']}")
                else:
                    items = data.get("items", [])
                    
                    if items:
                        videos = []
                        for item in items:
                            video_id = item["id"].get("videoId")
                            if not video_id:
                                continue
                            
                            # Get duration for each video
                            duration = get_video_duration(video_id)
                            
                            videos.append({
                                "youtube_id": video_id,
                                "title": item["snippet"]["title"],
                                "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
                                "channel": item["snippet"]["channelTitle"],
                                "description": item["snippet"]["description"][:120],
                                "duration_sec": duration,
                            })
                        
                        if videos:
                            logger.info(f"Found {len(videos)} videos from YouTube API")
                            return {
                                "videos": videos,
                                "query": query,
                                "count": len(videos),
                                "source": "youtube_api"
                            }
        except Exception as e:
            logger.warning(f"YouTube API failed: {e}")
    
    # Fallback to static videos
    logger.info(f"Using fallback videos for goal: {goal_key}")
    
    # Get fallback videos for the goal
    fallback_videos = FALLBACK_VIDEOS.get(goal_key, FALLBACK_VIDEOS["general"])
    
    # If exercise_name is provided, try to filter fallback videos
    if exercise_name:
        filtered = [v for v in fallback_videos if exercise_name.lower() in v["title"].lower()]
        if filtered:
            fallback_videos = filtered
    
    return {
        "videos": fallback_videos[:8],
        "query": query,
        "count": len(fallback_videos[:8]),
        "source": "fallback",
        "message": "Showing sample videos. YouTube API may be temporarily unavailable."
    }