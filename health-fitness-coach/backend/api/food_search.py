"""
Food Database Search API
Integrates with OpenFoodFacts API for comprehensive food nutrition data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import httpx
import asyncio

from api.schemas import FoodSearchRequest, FoodSearchResponse, FoodSearchResult
from api.auth import get_current_user
from database.models import User

router = APIRouter(prefix="/api/food-search", tags=["food-search"])

# OpenFoodFacts API endpoints
OPENFOODFACTS_API = "https://world.openfoodfacts.org/api/v0"


async def search_openfoodfacts(query: str, limit: int = 10) -> List[FoodSearchResult]:
    """Search OpenFoodFacts database for food items"""
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Search endpoint
            search_url = f"{OPENFOODFACTS_API}/cgi/search.pl"
            params = {
                "search_terms": query,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": limit,
            }
            
            response = await client.get(search_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for product in data.get("products", []):
                try:
                    # Extract nutrition facts
                    nutrition = product.get("nutriments", {})
                    
                    result = FoodSearchResult(
                        name=product.get("product_name", "Unknown"),
                        brand=product.get("brands", None),
                        serving_size=product.get("serving_size", "100g"),
                        calories=float(nutrition.get("energy-kcal", 0) or 0),
                        protein_grams=float(nutrition.get("proteins", 0) or 0),
                        carbs_grams=float(nutrition.get("carbohydrates", 0) or 0),
                        fats_grams=float(nutrition.get("fat", 0) or 0),
                        barcode=product.get("code", None),
                        nutrition_grade=product.get("nutrition_grade_fr", None),
                    )
                    results.append(result)
                except (ValueError, KeyError, TypeError):
                    continue
            
            return results
    
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Food database API unavailable: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching food database: {str(e)}",
        )


@router.post("/search", response_model=FoodSearchResponse)
async def search_food(
    request: FoodSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Search food database by name or ingredient.
    
    Returns nutrition information for matching foods.
    Data source: OpenFoodFacts (free, open database)
    """
    
    if not request.query or len(request.query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters",
        )
    
    results = await search_openfoodfacts(request.query, request.limit)
    
    return FoodSearchResponse(
        results=results,
        total_found=len(results),
    )


@router.get("/search-by-barcode", response_model=FoodSearchResponse)
async def search_by_barcode(
    barcode: str,
    current_user: User = Depends(get_current_user),
):
    """
    Search food by barcode (UPC/EAN code).
    
    Useful for mobile barcode scanner integration.
    """
    
    if not barcode or len(barcode) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid barcode format",
        )
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Direct lookup by barcode
            url = f"{OPENFOODFACTS_API}/product/{barcode}.json"
            
            response = await client.get(url)
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found in database",
                )
            
            response.raise_for_status()
            product = response.json().get("product", {})
            
            nutrition = product.get("nutriments", {})
            
            result = FoodSearchResult(
                name=product.get("product_name", "Unknown"),
                brand=product.get("brands", None),
                serving_size=product.get("serving_size", "100g"),
                calories=float(nutrition.get("energy-kcal", 0) or 0),
                protein_grams=float(nutrition.get("proteins", 0) or 0),
                carbs_grams=float(nutrition.get("carbohydrates", 0) or 0),
                fats_grams=float(nutrition.get("fat", 0) or 0),
                barcode=product.get("code", barcode),
                nutrition_grade=product.get("nutrition_grade_fr", None),
            )
            
            return FoodSearchResponse(
                results=[result],
                total_found=1,
            )
    
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Food database API unavailable",
        )


@router.get("/popular-foods", response_model=FoodSearchResponse)
async def get_popular_foods(
    category: str = "common",
    current_user: User = Depends(get_current_user),
):
    """
    Get list of popular/common foods for quick logging.
    
    Pre-populated categories: common, protein, carbs, fats, snacks, fruits, vegetables
    """
    
    # Common foods with known nutrition data
    common_foods_db = {
        "common": [
            {"name": "Chicken Breast (100g)", "calories": 165, "protein": 31, "carbs": 0, "fats": 3.6},
            {"name": "Brown Rice (100g cooked)", "calories": 111, "protein": 2.6, "carbs": 23, "fats": 0.9},
            {"name": "Broccoli (100g)", "calories": 34, "protein": 2.8, "carbs": 7, "fats": 0.4},
            {"name": "Sweet Potato (100g)", "calories": 86, "protein": 1.6, "carbs": 20, "fats": 0.1},
            {"name": "Salmon (100g)", "calories": 208, "protein": 25, "carbs": 0, "fats": 11},
            {"name": "Eggs (1 large)", "calories": 78, "protein": 6, "carbs": 0.6, "fats": 5},
            {"name": "Almonds (30g)", "calories": 164, "protein": 6, "carbs": 6, "fats": 14},
            {"name": "Banana (medium)", "calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.3},
            {"name": "Greek Yogurt (100g)", "calories": 59, "protein": 10, "carbs": 3, "fats": 0.4},
            {"name": "Olive Oil (1 tbsp)", "calories": 119, "protein": 0, "carbs": 0, "fats": 13.5},
        ],
        "protein": [
            {"name": "Chicken Breast (100g)", "calories": 165, "protein": 31, "carbs": 0, "fats": 3.6},
            {"name": "Ground Beef (100g, lean)", "calories": 143, "protein": 25, "carbs": 0, "fats": 5},
            {"name": "Tuna (100g canned)", "calories": 103, "protein": 23, "carbs": 0, "fats": 0.8},
            {"name": "Tofu (100g, firm)", "calories": 76, "protein": 8.3, "carbs": 1.9, "fats": 4.8},
            {"name": "Greek Yogurt (100g)", "calories": 59, "protein": 10, "carbs": 3, "fats": 0.4},
        ],
        "carbs": [
            {"name": "Brown Rice (100g cooked)", "calories": 111, "protein": 2.6, "carbs": 23, "fats": 0.9},
            {"name": "Whole Wheat Bread (1 slice)", "calories": 80, "protein": 4, "carbs": 14, "fats": 1},
            {"name": "Oatmeal (30g dry)", "calories": 150, "protein": 5, "carbs": 27, "fats": 3},
            {"name": "Sweet Potato (100g)", "calories": 86, "protein": 1.6, "carbs": 20, "fats": 0.1},
            {"name": "Banana (medium)", "calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.3},
        ],
        "fats": [
            {"name": "Olive Oil (1 tbsp)", "calories": 119, "protein": 0, "carbs": 0, "fats": 13.5},
            {"name": "Almonds (30g)", "calories": 164, "protein": 6, "carbs": 6, "fats": 14},
            {"name": "Avocado (100g)", "calories": 160, "protein": 2, "carbs": 9, "fats": 15},
            {"name": "Salmon (100g)", "calories": 208, "protein": 25, "carbs": 0, "fats": 11},
            {"name": "Peanut Butter (2 tbsp)", "calories": 188, "protein": 8, "carbs": 7, "fats": 16},
        ],
    }
    
    foods = common_foods_db.get(category, common_foods_db["common"])
    
    results = [
        FoodSearchResult(
            name=food["name"],
            calories=food["calories"],
            protein_grams=food["protein"],
            carbs_grams=food["carbs"],
            fats_grams=food["fats"],
            brand="Common",
            serving_size="See name",
        )
        for food in foods
    ]
    
    return FoodSearchResponse(
        results=results,
        total_found=len(results),
    )
