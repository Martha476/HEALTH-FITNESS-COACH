"""
Tools for the Health Fitness Coach Agent.

These tools handle:
- Workout plan generation
- Nutrition calculation
- Progress analysis
- Exercise database search
- Goal tracking
- Weather-based exercise recommendations (External API)
- Response caching
- Feedback collection
"""

from typing import Dict, List, Any, Optional
import json
from datetime import datetime, timedelta
import aiohttp
import hashlib


async def generate_workout_plan(
    fitness_level: str = "intermediate",
    goal: str = "build_muscle",
    days_per_week: int = 4,
    minutes_per_session: int = 60,
    equipment: Optional[List[str]] = None,
    injuries: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate a personalized workout plan.
    
    Args:
        fitness_level: beginner, intermediate, advanced
        goal: build_muscle, lose_fat, gain_strength, improve_endurance, general_fitness
        days_per_week: Training frequency
        minutes_per_session: Duration per session
        equipment: Available equipment (dumbbell, barbell, cable, machine, bodyweight)
        injuries: Any injuries or limitations to consider
    
    Returns:
        Workout plan with exercises, sets, reps, and rest periods
    """
    
    equipment = equipment or ["dumbbell", "barbell", "bodyweight"]
    injuries = injuries or []
    
    # Sample workout templates
    plans = {
        "build_muscle_intermediate_4_day": {
            "name": "Upper/Lower Split",
            "description": "4-day upper/lower split optimized for muscle growth",
            "structure": [
                {
                    "day": 1,
                    "name": "Upper Power",
                    "focus": ["chest", "back", "shoulders"],
                    "exercises": [
                        {
                            "name": "Barbell Bench Press",
                            "sets": 4,
                            "reps": "6-8",
                            "rest_seconds": 180,
                            "description": "Primary chest movement for strength",
                        },
                        {
                            "name": "Barbell Rows",
                            "sets": 4,
                            "reps": "6-8",
                            "rest_seconds": 180,
                            "description": "Back strength and mass builder",
                        },
                        {
                            "name": "Incline Dumbbell Press",
                            "sets": 3,
                            "reps": "8-10",
                            "rest_seconds": 120,
                            "description": "Upper chest and front delts",
                        },
                    ],
                },
                {
                    "day": 2,
                    "name": "Lower Power",
                    "focus": ["quads", "hamstrings", "glutes"],
                    "exercises": [
                        {
                            "name": "Barbell Squat",
                            "sets": 4,
                            "reps": "6-8",
                            "rest_seconds": 180,
                            "description": "Primary leg movement",
                        },
                        {
                            "name": "Deadlift",
                            "sets": 3,
                            "reps": "5-6",
                            "rest_seconds": 180,
                            "description": "Full body strength",
                        },
                    ],
                },
                {
                    "day": 3,
                    "name": "Rest/Light Activity",
                    "focus": ["recovery"],
                    "exercises": [
                        {
                            "name": "Walk or Yoga",
                            "duration_minutes": 30,
                            "intensity": "low",
                        },
                    ],
                },
                {
                    "day": 4,
                    "name": "Upper Hypertrophy",
                    "focus": ["chest", "back", "arms"],
                    "exercises": [
                        {
                            "name": "Incline Bench (Machine or Dumbbell)",
                            "sets": 3,
                            "reps": "8-12",
                            "rest_seconds": 90,
                        },
                    ],
                },
            ],
        },
        "lose_fat_intermediate_4_day": {
            "name": "Full Body with Cardio",
            "description": "4-day full body split with cardio for fat loss",
            "structure": [
                {
                    "day": 1,
                    "name": "Full Body A",
                    "focus": ["all"],
                    "exercises": [
                        {
                            "name": "Compound Movement",
                            "sets": 3,
                            "reps": "8-12",
                            "rest_seconds": 60,
                        },
                    ],
                    "cardio": "20 min moderate intensity",
                },
            ],
        },
    }
    
    # Get the appropriate plan
    plan_key = f"{goal.lower()}_{fitness_level.lower()}_{days_per_week}_day"
    if plan_key not in plans:
        plan_key = "build_muscle_intermediate_4_day"
    
    selected_plan = plans[plan_key]
    selected_plan["duration_weeks"] = 12
    selected_plan["notes"] = f"Progress by increasing weight, reps, or volume. Avoid exercises if you have {', '.join(injuries) if injuries else 'no injuries'}."
    
    return selected_plan


async def calculate_nutrition(
    weight_lbs: float,
    height_inches: float,
    age: int,
    gender: str = "male",
    activity_level: str = "moderate",
    goal: str = "maintain",
) -> Dict[str, Any]:
    """
    Calculate personalized nutrition recommendations.
    
    Args:
        weight_lbs: Body weight in pounds
        height_inches: Height in inches
        age: Age in years
        gender: male or female
        activity_level: sedentary, light, moderate, very_active, extremely_active
        goal: lose, maintain, gain
    
    Returns:
        Nutrition plan with macros, calorie targets, and meal ideas
    """
    
    # Convert to metric for calculations
    weight_kg = weight_lbs / 2.2
    height_cm = height_inches * 2.54
    
    # Harris-Benedict equation for BMR
    if gender.lower() == "male":
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
    
    # Activity multiplier
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "very_active": 1.725,
        "extremely_active": 1.9,
    }
    
    multiplier = activity_multipliers.get(activity_level, 1.55)
    tdee = bmr * multiplier
    
    # Calorie adjustment based on goal
    if goal.lower() == "lose":
        target_calories = tdee - 500  # 500 calorie deficit
    elif goal.lower() == "gain":
        target_calories = tdee + 300  # 300 calorie surplus
    else:
        target_calories = tdee
    
    # Macro calculation (aim for 1g protein per lb)
    protein_g = weight_lbs
    protein_calories = protein_g * 4
    
    if goal.lower() == "lose":
        fat_g = (target_calories * 0.25) / 9
        carb_calories = target_calories - protein_calories - (fat_g * 9)
    else:
        fat_g = (target_calories * 0.30) / 9
        carb_calories = target_calories - protein_calories - (fat_g * 9)
    
    carb_g = carb_calories / 4
    
    return {
        "daily_calorie_target": round(target_calories),
        "macros": {
            "protein": {"grams": round(protein_g), "calories": round(protein_calories)},
            "carbs": {"grams": round(carb_g), "calories": round(carb_calories)},
            "fat": {"grams": round(fat_g), "calories": round(fat_g * 9)},
        },
        "meal_frequency": "3-4 meals per day" if goal.lower() == "lose" else "3-4 meals + snacks",
        "hydration": "3-4 liters of water daily",
        "sample_meals": {
            "breakfast": ["Eggs with oatmeal and berries", "Chicken and rice", "Protein shake with banana"],
            "lunch": ["Grilled chicken with broccoli and rice", "Lean beef with sweet potato", "Salmon with asparagus"],
            "dinner": ["Turkey with green beans and rice", "Lean pork with vegetables", "Tilapia with zucchini"],
            "snacks": ["Greek yogurt", "Rice cakes with peanut butter", "Protein bar"],
        },
        "recommendations": [
            f"Eat approximately {round(target_calories)} calories daily",
            f"Consume {round(protein_g)}g of protein daily (from chicken, fish, eggs, legumes)",
            f"Include healthy fats (nuts, avocado, olive oil)",
            f"Prioritize whole foods over processed foods",
            "Time carbs around workouts for optimal performance",
        ],
    }


async def analyze_progress(
    metrics: Dict[str, List[Dict[str, Any]]],
    timeframe_days: int = 30,
) -> Dict[str, Any]:
    """
    Analyze fitness progress and provide insights.
    
    Args:
        metrics: Dictionary of metric names with historical data
        timeframe_days: Number of days to analyze
    
    Returns:
        Progress analysis with trends and recommendations
    """
    
    analysis = {
        "timeframe_days": timeframe_days,
        "metrics_analyzed": list(metrics.keys()),
        "trends": {},
        "insights": [],
        "recommendations": [],
    }
    
    for metric_name, data in metrics.items():
        if not data:
            continue
        
        recent_data = data[-7:] if len(data) > 7 else data
        
        if metric_name == "weight":
            values = [d.get("value", 0) for d in recent_data]
            if len(values) > 1:
                trend = values[-1] - values[0]
                analysis["trends"][metric_name] = {
                    "current": values[-1],
                    "change": trend,
                    "direction": "" if trend < 0 else "" if trend > 0 else "",
                }
        
        elif metric_name == "strength":
            values = [d.get("value", 0) for d in recent_data]
            if len(values) > 1:
                trend = ((values[-1] - values[0]) / values[0]) * 100
                analysis["trends"][metric_name] = {
                    "current": values[-1],
                    "improvement_percent": trend,
                }
    
    # Generate insights
    weight_trend = analysis["trends"].get("weight", {}).get("change", 0)
    if weight_trend < -3:
        analysis["insights"].append(" Great weight loss progress! Keep it up.")
    elif weight_trend > 3:
        analysis["insights"].append(" Weight is increasing. Check your calorie intake.")
    
    analysis["recommendations"] = [
        "Continue tracking metrics weekly for best insights",
        "Focus on progressive overload in strength training",
        "Maintain consistency with nutrition and training",
    ]
    
    return analysis


async def search_exercises(
    muscle_group: str = "all",
    equipment: Optional[List[str]] = None,
    difficulty: str = "all",
) -> Dict[str, List[Dict[str, str]]]:
    """
    Search for exercises by muscle group and equipment.
    
    Args:
        muscle_group: Muscle group to target (chest, back, legs, shoulders, etc.)
        equipment: List of available equipment
        difficulty: Exercise difficulty level
    
    Returns:
        List of exercises with descriptions and form tips
    """
    
    exercise_database = {
        "chest": [
            {
                "name": "Barbell Bench Press",
                "equipment": ["barbell", "bench"],
                "difficulty": "intermediate",
                "description": "Lie on bench, lower bar to chest, press back up",
                "muscles": ["chest", "triceps", "shoulders"],
                "difficulty_level": 7,
            },
            {
                "name": "Push-ups",
                "equipment": ["bodyweight"],
                "difficulty": "beginner",
                "description": "Start in plank position, lower body until chest nearly touches floor, push back up",
                "muscles": ["chest", "triceps", "core"],
                "difficulty_level": 4,
            },
        ],
        "back": [
            {
                "name": "Barbell Deadlift",
                "equipment": ["barbell"],
                "difficulty": "advanced",
                "description": "Bend at hips and knees, grip bar, drive through heels to stand",
                "muscles": ["back", "hamstrings", "glutes", "core"],
                "difficulty_level": 9,
            },
            {
                "name": "Barbell Rows",
                "equipment": ["barbell"],
                "difficulty": "intermediate",
                "description": "Hinge at hips, row bar to chest, control descent",
                "muscles": ["back", "biceps"],
                "difficulty_level": 7,
            },
        ],
        "legs": [
            {
                "name": "Barbell Squat",
                "equipment": ["barbell", "rack"],
                "difficulty": "intermediate",
                "description": "Squat depth- descent controlled, drive through heels to stand",
                "muscles": ["quads", "hamstrings", "glutes"],
                "difficulty_level": 8,
            },
        ],
    }
    
    # Filter exercises
    available_exercises = []
    
    for group, exercises in exercise_database.items():
        if muscle_group.lower() != "all" and group.lower() != muscle_group.lower():
            continue
        
        for exercise in exercises:
            # Check equipment match
            if equipment and not any(eq.lower() in [e.lower() for e in exercise["equipment"]] for eq in equipment):
                continue
            
            available_exercises.append(exercise)
    
    return {"exercises": available_exercises, "count": len(available_exercises)}


async def track_goals(
    goals: List[Dict[str, Any]],
    timeline_days: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Help track and achieve fitness goals.
    
    Args:
        goals: List of fitness goals
        timeline_days: Timeline for achieving goals
    
    Returns:
        Goal tracking plan with milestones
    """
    
    tracking_plan = {
        "goals": goals,
        "milestones": [],
        "progress_check_frequency": "weekly",
        "success_metrics": [],
    }
    
    if timeline_days:
        weeks = timeline_days / 7
        tracking_plan["milestones"] = [
            {"week": int(weeks * 0.25), "description": "First check-in"},
            {"week": int(weeks * 0.5), "description": "Halfway progress"},
            {"week": int(weeks * 0.75), "description": "Final push"},
            {"week": int(weeks), "description": "Goal achievement"},
        ]
    
    tracking_plan["success_metrics"] = [
        "Track consistently every week",
        "Maintain at least 80% workout adherence",
        "Keep nutrition logs 5 days per week",
        "Adjust plan if progress stalls for 2+ weeks",
    ]
    
    tracking_plan["support_strategies"] = [
        "Find an accountability partner",
        "Join a fitness community",
        "Take progress photos",
        "Celebrate small wins",
        "Adjust expectations if needed",
    ]
    
    return tracking_plan


# --- User Profile Tools ---
def get_user_profile(user_profile):
    return f"User profile: {user_profile}"

def update_user_profile(user_profile, updates):
    return f"Updated profile: {updates}"


# --- Nutrition Tools ---
def log_meal(user_profile, meal_text):
    return f"Logged meal: {meal_text} for user {user_profile.get('id', 'unknown')}"

def get_daily_nutrition(user_profile):
    return "Today's nutrition: 1800 kcal, 120g protein, 60g fat, 200g carbs."

def calculate_calories(user_profile):
    return "Your daily calorie need is 2000 kcal."

def search_food_database(user_profile, food_query):
    return f"Food database result for {food_query}: 100 kcal per serving."

def generate_meal_plan(user_profile):
    return "Sample meal plan: Breakfast - Oatmeal, Lunch - Chicken salad, Dinner - Salmon & rice."

def generate_shopping_list(user_profile):
    return "Shopping list: Oats, Chicken, Salmon, Rice, Vegetables."


# --- Workout Tools ---
def get_workout_history(user_profile):
    return "Workout history: Mon - Chest, Wed - Back, Fri - Legs."

def log_workout(user_profile, workout_text):
    return f"Logged workout: {workout_text} for user {user_profile.get('id', 'unknown')}"

def generate_workout_plan(user_profile):
    return "Workout plan: 4 days/week, Upper/Lower split."

def search_exercise_database(user_profile, exercise_query):
    return f"Exercise info for {exercise_query}: Deadlift - works back, legs, core."

def calculate_calories_burned(user_profile, activity):
    return "Estimated calories burned: 300 kcal."


# --- Progress Tools ---
def get_progress_data(user_profile):
    return "Progress: Down 2kg in 4 weeks."

def log_weight(user_profile, weight_text):
    return f"Logged weight: {weight_text} for user {user_profile.get('id', 'unknown')}"

def analyze_progress(user_profile):
    return "Analysis: Weight loss on track, keep up the good work!"


# --- Response Caching System ---
class ResponseCache:
    """Simple in-memory cache for responses"""
    _cache: Dict[str, Dict[str, Any]] = {}
    _max_entries = 100
    _ttl_seconds = 3600  # 1 hour
    
    @classmethod
    def get_cache_key(cls, prompt: str, llm: str) -> str:
        """Generate cache key from prompt and LLM"""
        key_data = f"{prompt}:{llm}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    @classmethod
    def get(cls, prompt: str, llm: str) -> Optional[str]:
        """Get cached response"""
        key = cls.get_cache_key(prompt, llm)
        if key in cls._cache:
            entry = cls._cache[key]
            # Check if expired
            if datetime.utcnow() - entry["timestamp"] < timedelta(seconds=cls._ttl_seconds):
                entry["hits"] += 1
                return entry["response"]
            else:
                del cls._cache[key]
        return None
    
    @classmethod
    def set(cls, prompt: str, llm: str, response: str) -> None:
        """Cache response"""
        if len(cls._cache) >= cls._max_entries:
            # Remove oldest entry
            oldest_key = min(cls._cache.keys(), key=lambda k: cls._cache[k]["timestamp"])
            del cls._cache[oldest_key]
        
        key = cls.get_cache_key(prompt, llm)
        cls._cache[key] = {
            "response": response,
            "timestamp": datetime.utcnow(),
            "hits": 0
        }
    
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Get cache statistics"""
        total_hits = sum(entry.get("hits", 0) for entry in cls._cache.values())
        return {
            "entries": len(cls._cache),
            "total_hits": total_hits,
            "max_entries": cls._max_entries
        }


# --- External API: Weather-Based Exercise Recommendations ---
async def get_weather_exercise_recommendations(
    latitude: float = 40.7128,
    longitude: float = -74.0060,
    country_code: str = "US"
) -> Dict[str, Any]:
    """
    Fetch weather data and provide exercise recommendations.
    Uses Open-Meteo free weather API (no authentication required).
    
    Args:
        latitude: Location latitude (default: NYC)
        longitude: Location longitude (default: NYC)
        country_code: Country code for reference
    
    Returns:
        Weather info + tailored exercise recommendations
    """
    try:
        async with aiohttp.ClientSession() as session:
            # Call Open-Meteo weather API (free, no key required)
            url = f"https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,weather_code,wind_speed_10m",
                "temperature_unit": "fahrenheit"
            }
            
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    return {
                        "error": f"Weather API error: {response.status}",
                        "recommendations": get_fallback_exercise_recommendations()
                    }
                
                data = await response.json()
                current = data.get("current", {})
                
                temp = current.get("temperature_2m", 70)
                weather_code = current.get("weather_code", 0)
                wind_speed = current.get("wind_speed_10m", 0)
                
                return {
                    "location": {"latitude": latitude, "longitude": longitude, "country": country_code},
                    "weather": {
                        "temperature": f"{temp}°F",
                        "weather_code": weather_code,
                        "wind_speed": f"{wind_speed} mph",
                        "description": interpret_weather_code(weather_code)
                    },
                    "recommendations": get_weather_based_recommendations(temp, weather_code, wind_speed),
                    "source": "Open-Meteo API"
                }
    
    except Exception as e:
        return {
            "error": f"Weather API call failed: {str(e)}",
            "recommendations": get_fallback_exercise_recommendations()
        }


def interpret_weather_code(code: int) -> str:
    """Interpret WMO weather codes"""
    descriptions = {
        0: "Clear sky - Perfect for outdoor exercise!",
        1: "Mainly clear - Good for outdoor activities",
        2: "Partly cloudy - Nice conditions",
        3: "Overcast - Still good for outdoor work",
        45: "Foggy - Use caution, stay visible",
        48: "Depositing rime fog - Be careful",
        51: "Light drizzle - Light rain jacket recommended",
        53: "Moderate drizzle - Bring rain gear",
        55: "Dense drizzle - Indoor exercise might be better",
        61: "Slight rain - Rain jacket needed",
        63: "Moderate rain - Better indoors",
        65: "Heavy rain - Definitely indoors",
        71: "Slight snow - Winter exercise!",
        73: "Moderate snow - Snow workout time",
        75: "Heavy snow - Stay inside",
        80: "Slight rain showers - Quick indoor workout",
        82: "Heavy rain showers - Definitely indoors",
        85: "Slight snow showers - Interesting challenge",
        86: "Heavy snow showers - Stay inside"
    }
    return descriptions.get(code, "Variable conditions - Check locally")


def get_weather_based_recommendations(temp: float, weather_code: int, wind_speed: float) -> Dict[str, Any]:
    """Generate exercise recommendations based on weather"""
    recommendations = {
        "indoor_exercises": [],
        "outdoor_exercises": [],
        "warnings": [],
        "tips": []
    }
    
    # Temperature-based recommendations
    if temp < 32:
        recommendations["warnings"].append("❄️ Very cold - wear multiple layers and warm up extra")
        recommendations["indoor_exercises"] = ["Indoor cycling", "Jump rope", "HIIT workouts", "Swimming (heated pool)"]
        recommendations["tips"].append("Avoid extreme cold exposure without proper gear")
    elif temp < 50:
        recommendations["indoor_exercises"] = ["Gym workouts", "Yoga", "Pilates"]
        recommendations["outdoor_exercises"] = ["Running with layers", "Brisk walking", "Cycling"]
        recommendations["tips"].append("Layer up for outdoor activities")
    elif temp < 70:
        recommendations["outdoor_exercises"] = ["Running", "Cycling", "Hiking", "Sports"]
        recommendations["indoor_exercises"] = ["Gym", "Swimming"]
        recommendations["tips"].append("Ideal workout conditions!")
    elif temp < 85:
        recommendations["indoor_exercises"] = ["Swimming", "Gym with AC", "Indoor cycling"]
        recommendations["outdoor_exercises"] = ["Early morning run", "Evening walk", "Swimming"]
        recommendations["tips"].append("Exercise early morning or evening to avoid heat")
        recommendations["warnings"].append("☀️ Warm day - stay hydrated")
    else:
        recommendations["indoor_exercises"] = ["Air-conditioned gym", "Swimming", "Indoor sports"]
        recommendations["warnings"].append("🥵 Very hot - prioritize hydration and indoor exercise")
        recommendations["tips"].append("Avoid peak afternoon hours (10am-4pm)")
    
    # Weather code-based recommendations
    if weather_code in [51, 53, 55, 61, 63, 65]:  # Rain codes
        if weather_code in [61, 63, 65]:
            recommendations["warnings"].append("🌧️ Rain - heavy rain, better to train indoors")
        else:
            recommendations["tips"].append("Light rain - can still train outdoor with rain jacket")
        recommendations["indoor_exercises"].extend(["Treadmill", "Rowing machine", "CrossFit"])
    
    elif weather_code in [71, 73, 75, 85, 86]:  # Snow codes
        if weather_code in [75, 86]:
            recommendations["warnings"].append("❄️ Heavy snow - indoor training recommended")
        recommendations["outdoor_exercises"].extend(["Snowshoeing", "Cross-country skiing"])
    
    # Wind-based recommendations
    if wind_speed > 25:
        recommendations["warnings"].append(f"💨 Strong winds ({wind_speed} mph) - be cautious outside")
        recommendations["tips"].append("Consider indoor workouts on windy days")
    
    return recommendations


def get_fallback_exercise_recommendations() -> Dict[str, Any]:
    """Fallback recommendations when API is unavailable"""
    return {
        "indoor_exercises": [
            "Strength training",
            "Yoga",
            "Pilates",
            "Treadmill running",
            "Cycling (stationary)",
            "Swimming",
            "CrossFit"
        ],
        "outdoor_exercises": [
            "Running",
            "Cycling",
            "Hiking",
            "Walking",
            "Sports",
            "Outdoor bootcamp"
        ],
        "tips": ["Mix indoor and outdoor activities", "Consistency beats perfect conditions"]
    }


# --- Feedback Collection and Analysis ---
class FeedbackCollector:
    """Collect and analyze user feedback on responses"""
    _feedback_data: Dict[str, List[Dict[str, Any]]] = {}
    
    @classmethod
    def submit_feedback(
        cls,
        user_id: str,
        message_id: str,
        rating: int,
        comment: str = "",
        helpful: bool = True,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Submit feedback on a response.
        
        Args:
            user_id: User ID
            message_id: Message ID being rated
            rating: 1-5 star rating
            comment: Optional feedback comment
            helpful: Whether response was helpful
            tags: Tags describing feedback (e.g., "too_long", "needs_detail", "unclear")
        
        Returns:
            Confirmation with feedback ID
        """
        if user_id not in cls._feedback_data:
            cls._feedback_data[user_id] = []
        
        feedback_id = hashlib.md5(f"{user_id}{message_id}{datetime.utcnow()}".encode()).hexdigest()[:8]
        
        feedback = {
            "id": feedback_id,
            "message_id": message_id,
            "rating": max(1, min(5, rating)),  # Clamp to 1-5
            "comment": comment,
            "helpful": helpful,
            "tags": tags or [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        cls._feedback_data[user_id].append(feedback)
        
        return {
            "status": "feedback_recorded",
            "feedback_id": feedback_id,
            "message": f"Thank you for rating this response {rating}⭐"
        }
    
    @classmethod
    def get_user_feedback(cls, user_id: str) -> Dict[str, Any]:
        """Get all feedback for a user"""
        feedback = cls._feedback_data.get(user_id, [])
        
        if not feedback:
            return {"user_id": user_id, "feedback_count": 0, "feedback": []}
        
        avg_rating = sum(f["rating"] for f in feedback) / len(feedback)
        helpful_count = sum(1 for f in feedback if f["helpful"])
        
        # Analyze common tags
        tag_frequency = {}
        for f in feedback:
            for tag in f.get("tags", []):
                tag_frequency[tag] = tag_frequency.get(tag, 0) + 1
        
        return {
            "user_id": user_id,
            "feedback_count": len(feedback),
            "average_rating": round(avg_rating, 2),
            "helpful_percentage": round((helpful_count / len(feedback)) * 100, 1),
            "common_issues": sorted(tag_frequency.items(), key=lambda x: x[1], reverse=True)[:5],
            "recent_feedback": feedback[-5:]  # Last 5 feedback entries
        }
    
    @classmethod
    def get_aggregate_insights(cls) -> Dict[str, Any]:
        """Get aggregate feedback insights across all users"""
        all_feedback = []
        for feedback_list in cls._feedback_data.values():
            all_feedback.extend(feedback_list)
        
        if not all_feedback:
            return {"total_feedback": 0, "insights": []}
        
        avg_rating = sum(f["rating"] for f in all_feedback) / len(all_feedback)
        helpful_count = sum(1 for f in all_feedback if f["helpful"])
        
        return {
            "total_feedback_count": len(all_feedback),
            "average_rating": round(avg_rating, 2),
            "overall_helpful_rate": round((helpful_count / len(all_feedback)) * 100, 1),
            "rating_distribution": get_rating_distribution(all_feedback),
            "improvement_areas": extract_improvement_areas(all_feedback)
        }


def get_rating_distribution(feedback_list: List[Dict[str, Any]]) -> Dict[int, int]:
    """Count distribution of ratings"""
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for f in feedback_list:
        rating = f.get("rating", 3)
        distribution[rating] = distribution.get(rating, 0) + 1
    return distribution


def extract_improvement_areas(feedback_list: List[Dict[str, Any]]) -> List[str]:
    """Extract common improvement areas from feedback"""
    tag_frequency = {}
    for f in feedback_list:
        for tag in f.get("tags", []):
            tag_frequency[tag] = tag_frequency.get(tag, 0) + 1
    
    # Return top 3 most mentioned issues
    return [tag for tag, _ in sorted(tag_frequency.items(), key=lambda x: x[1], reverse=True)[:3]]

def get_streak_data(user_profile):
    return "Streak: 7 days of workouts logged."


# --- Knowledge Base Tools ---
def search_fitness_knowledge(user_profile, query):
    return f"Fitness knowledge: {query} means progressive overload, increasing weight over time."

def search_nutrition_knowledge(user_profile, query):
    return f"Nutrition knowledge: {query} - protein is essential for muscle growth."

def search_health_knowledge(user_profile, query):
    return f"Health knowledge: {query} - consult a doctor for injuries."


# --- Utility Tools ---
def get_current_date_time():
    from datetime import datetime
    return f"Current date/time: {datetime.now()}"

def send_notification(user_profile, message):
    return f"Notification sent to {user_profile.get('id', 'unknown')}: {message}"

def calculate_bmi(user_profile):
    return "Your BMI is 23.4 (Normal weight)."

def get_hydration_recommendation(user_profile):
    return "Recommended water intake: 2.5L/day."
