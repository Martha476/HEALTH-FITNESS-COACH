"""
Food Recommendations API
Provides intelligent food recommendations based on user goals and dietary preferences.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from database import get_db
from database.models import User
from api.auth import get_current_user

router = APIRouter(prefix="/api/food-recommendations", tags=["food-recommendations"])


class FoodRecommendation(BaseModel):
    """A food recommendation"""
    name: str
    description: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    serving: str
    goal_alignment: str  # e.g., "High Protein", "Low Calorie", "Balanced"


# Comprehensive food database organized by goals
FOOD_DATABASE: Dict[str, List[Dict[str, Any]]] = {
    "lose-weight": [
        {
            "name": "Grilled Chicken Breast with Broccoli",
            "description": "Lean protein with low-calorie veggies",
            "calories": 165,
            "protein_g": 31,
            "carbs_g": 0,
            "fat_g": 3.6,
            "serving": "100g chicken + 100g broccoli",
            "goal_alignment": "High Protein, Low Calorie"
        },
        {
            "name": "Egg White Omelette with Spinach",
            "description": "Low-calorie protein-rich breakfast",
            "calories": 120,
            "protein_g": 22,
            "carbs_g": 2,
            "fat_g": 1,
            "serving": "3 egg whites + 50g spinach",
            "goal_alignment": "High Protein, Low Fat"
        },
        {
            "name": "Grilled Salmon with Lemon",
            "description": "Omega-3 rich fish with minimal calories",
            "calories": 208,
            "protein_g": 20,
            "carbs_g": 0,
            "fat_g": 13,
            "serving": "100g grilled salmon",
            "goal_alignment": "High Protein, Heart Healthy"
        },
        {
            "name": "Turkey Breast Sandwich on Whole Wheat",
            "description": "Lean meat with complex carbs",
            "calories": 280,
            "protein_g": 28,
            "carbs_g": 30,
            "fat_g": 5,
            "serving": "3oz turkey + 2 slices whole wheat bread",
            "goal_alignment": "Balanced Macros, Whole Grain"
        },
        {
            "name": "Zucchini Noodles with Ground Turkey",
            "description": "Low-carb pasta alternative with lean protein",
            "calories": 200,
            "protein_g": 25,
            "carbs_g": 8,
            "fat_g": 8,
            "serving": "150g zucchini noodles + 100g turkey",
            "goal_alignment": "Low Calorie, High Protein"
        }
    ],
    "build-muscle": [
        {
            "name": "Steak with Sweet Potato and Vegetables",
            "description": "High-protein meal with complex carbs for muscle growth",
            "calories": 720,
            "protein_g": 58,
            "carbs_g": 62,
            "fat_g": 22,
            "serving": "8oz sirloin + 150g sweet potato",
            "goal_alignment": "Muscle Building, High Protein"
        },
        {
            "name": "Salmon with Quinoa and Avocado",
            "description": "Complete amino acid profile with healthy fats",
            "calories": 620,
            "protein_g": 48,
            "carbs_g": 55,
            "fat_g": 20,
            "serving": "150g salmon + 1 cup quinoa + 0.5 avocado",
            "goal_alignment": "Complete Protein, Healthy Fats"
        },
        {
            "name": "Chicken with Brown Rice and Peanut Butter",
            "description": "Calorie-dense meal for muscle gain",
            "calories": 680,
            "protein_g": 52,
            "carbs_g": 68,
            "fat_g": 24,
            "serving": "150g chicken + 1 cup brown rice + 2 tbsp peanut butter",
            "goal_alignment": "Muscle Building, High Calorie"
        },
        {
            "name": "Beef Stir-Fry with Brown Rice",
            "description": "Iron-rich red meat with energy-boosting carbs",
            "calories": 650,
            "protein_g": 45,
            "carbs_g": 72,
            "fat_g": 18,
            "serving": "150g beef + 1 cup brown rice + vegetables",
            "goal_alignment": "Muscle Building, Iron Rich"
        },
        {
            "name": "High-Protein Pasta with Ground Beef",
            "description": "Muscle-building meal with complete nutrition",
            "calories": 680,
            "protein_g": 50,
            "carbs_g": 75,
            "fat_g": 16,
            "serving": "150g ground beef + 150g protein pasta + marinara",
            "goal_alignment": "Muscle Building, High Protein Carbs"
        }
    ],
    "maintain": [
        {
            "name": "Balanced Chicken Bowl",
            "description": "Perfectly balanced macros for maintenance",
            "calories": 520,
            "protein_g": 38,
            "carbs_g": 52,
            "fat_g": 15,
            "serving": "120g grilled chicken + 1 cup brown rice + vegetables",
            "goal_alignment": "Balanced Macros"
        },
        {
            "name": "Mediterranean Fish Plate",
            "description": "Heart-healthy balanced meal",
            "calories": 480,
            "protein_g": 35,
            "carbs_g": 48,
            "fat_g": 16,
            "serving": "120g grilled fish + 1 cup couscous + roasted vegetables",
            "goal_alignment": "Mediterranean, Balanced"
        },
        {
            "name": "Vegetarian Protein Bowl",
            "description": "Plant-based complete nutrition",
            "calories": 450,
            "protein_g": 18,
            "carbs_g": 58,
            "fat_g": 14,
            "serving": "1 cup cooked chickpeas + 1 cup quinoa + vegetables",
            "goal_alignment": "Plant-Based, Balanced"
        },
        {
            "name": "Whole Wheat Pasta with Lean Meat Sauce",
            "description": "Comfort food with balanced nutrition",
            "calories": 510,
            "protein_g": 36,
            "carbs_g": 58,
            "fat_g": 13,
            "serving": "150g whole wheat pasta + 100g turkey + marinara",
            "goal_alignment": "Whole Grain, Balanced"
        },
        {
            "name": "Greek Salad with Grilled Chicken",
            "description": "Fresh, nutritious, and satisfying",
            "calories": 420,
            "protein_g": 38,
            "carbs_g": 25,
            "fat_g": 18,
            "serving": "120g chicken + mixed greens + feta + olive oil dressing",
            "goal_alignment": "Fresh, Balanced Macros"
        }
    ]
}


def determine_goal_category(goal: Optional[str]) -> str:
    """Convert user goal to food recommendation category"""
    if not goal:
        return "maintain"
    
    goal_lower = goal.lower()
    
    if any(x in goal_lower for x in ["lose-weight", "weight-loss", "lose weight", "weight loss", "fat loss"]):
        return "lose-weight"
    elif any(x in goal_lower for x in ["build-muscle", "muscle-gain", "muscle gain", "strength", "hypertrophy"]):
        return "build-muscle"
    else:
        return "maintain"


@router.get("/recommendations")
async def get_food_recommendations(
    current_user: User = Depends(get_current_user),
    goal: Optional[str] = None,
    limit: int = 5,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get AI-suggested food recommendations based on user's fitness goal.
    
    Parameters:
    - goal: User's fitness goal (optional, defaults to user's profile goal)
    - limit: Number of recommendations (default 5)
    
    Returns:
    - List of food recommendations with macros and descriptions
    """
    
    try:
        # Get user's goal from profile if not provided
        user_goal = goal or (current_user.goals[0] if current_user.goals else None)
        
        # Determine which category to pull from
        goal_category = determine_goal_category(user_goal)
        
        # Get recommendations from database
        all_foods = FOOD_DATABASE.get(goal_category, FOOD_DATABASE["maintain"])
        
        # Return requested number of recommendations
        recommendations = all_foods[:limit]
        
        return {
            "status": "success",
            "goal_category": goal_category,
            "user_goal": user_goal,
            "count": len(recommendations),
            "recommendations": [
                FoodRecommendation(**food).model_dump()
                for food in recommendations
            ]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )


@router.get("/recommendations/{goal_type}")
async def get_recommendations_by_goal_type(
    goal_type: str,
    current_user: User = Depends(get_current_user),
    limit: int = 5,
) -> Dict[str, Any]:
    """
    Get food recommendations for a specific goal type.
    
    Parameters:
    - goal_type: One of 'lose-weight', 'build-muscle', 'maintain'
    - limit: Number of recommendations (default 5)
    """
    
    valid_goals = ["lose-weight", "build-muscle", "maintain"]
    
    if goal_type not in valid_goals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid goal type. Must be one of: {', '.join(valid_goals)}"
        )
    
    try:
        all_foods = FOOD_DATABASE.get(goal_type, [])
        recommendations = all_foods[:limit]
        
        return {
            "status": "success",
            "goal_type": goal_type,
            "count": len(recommendations),
            "recommendations": [
                FoodRecommendation(**food).model_dump()
                for food in recommendations
            ]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )
