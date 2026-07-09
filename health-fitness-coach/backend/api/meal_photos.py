"""
Meal Photo Logging API
Allows users to upload meal photos with AI-based calorie estimation.
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import uuid
import aiofiles
import os

from database import get_db
from database.models import User, MealPhoto
from api.schemas import MealPhotoRequest, MealPhotoResponse
from api.auth import get_current_user

router = APIRouter(prefix="/api/meals/photos", tags=["meal-photos"])

# Directory to store meal photos
MEAL_PHOTOS_DIR = "backend/data/meal_photos"
os.makedirs(MEAL_PHOTOS_DIR, exist_ok=True)


def estimate_calories_from_image(image_path: str) -> dict:
    """
    Estimate calories and macros from meal image using AI.
    In production, integrate with Claude Vision API or similar.
    """
    # Placeholder for AI-based calorie estimation
    # This would use Claude's vision capabilities or similar API
    return {
        "estimated_calories": 500,  # Placeholder
        "estimated_macros": {
            "protein": 25,
            "carbs": 60,
            "fats": 15,
        },
    }


@router.post("", response_model=MealPhotoResponse)
async def upload_meal_photo(
    file: UploadFile = File(...),
    meal_type: str = "lunch",
    user_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload meal photo for AI-based calorie estimation.
    
    Supported formats: PNG, JPEG, GIF
    """
    
    # Validate file type
    allowed_extensions = {"png", "jpg", "jpeg", "gif"}
    file_extension = file.filename.split(".")[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported: {allowed_extensions}",
        )
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(MEAL_PHOTOS_DIR, f"{file_id}.{file_extension}")
    
    try:
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )
    
    # Estimate calories using AI
    estimation = estimate_calories_from_image(file_path)
    
    # Create meal photo record
    meal_photo = MealPhoto(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        photo_url=file_path,
        estimated_calories=estimation["estimated_calories"],
        estimated_macros=estimation["estimated_macros"],
        user_notes=user_notes,
        meal_type=meal_type,
    )
    
    db.add(meal_photo)
    db.commit()
    db.refresh(meal_photo)
    
    return MealPhotoResponse(**meal_photo.__dict__)


@router.get("", response_model=List[MealPhotoResponse])
async def get_meal_photos(
    meal_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's meal photo history"""
    
    query = db.query(MealPhoto).filter(
        MealPhoto.user_id == current_user.id,
    )
    
    if meal_type:
        query = query.filter(MealPhoto.meal_type == meal_type)
    
    photos = query.order_by(MealPhoto.logged_date.desc()).limit(limit).all()
    
    return [MealPhotoResponse(**p.__dict__) for p in photos]


@router.get("/{photo_id}", response_model=MealPhotoResponse)
async def get_meal_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific meal photo details"""
    
    photo = db.query(MealPhoto).filter(
        MealPhoto.id == photo_id,
        MealPhoto.user_id == current_user.id,
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal photo not found",
        )
    
    return MealPhotoResponse(**photo.__dict__)


@router.put("/{photo_id}", response_model=MealPhotoResponse)
async def update_meal_photo(
    photo_id: str,
    user_notes: Optional[str] = None,
    estimated_calories: Optional[float] = None,
    estimated_macros: Optional[dict] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update meal photo details or user corrections"""
    
    photo = db.query(MealPhoto).filter(
        MealPhoto.id == photo_id,
        MealPhoto.user_id == current_user.id,
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal photo not found",
        )
    
    if user_notes is not None:
        photo.user_notes = user_notes
    if estimated_calories is not None:
        photo.estimated_calories = estimated_calories
    if estimated_macros is not None:
        photo.estimated_macros = estimated_macros
    
    db.commit()
    db.refresh(photo)
    
    return MealPhotoResponse(**photo.__dict__)


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete meal photo record"""
    
    photo = db.query(MealPhoto).filter(
        MealPhoto.id == photo_id,
        MealPhoto.user_id == current_user.id,
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal photo not found",
        )
    
    # Delete file
    try:
        if os.path.exists(photo.photo_url):
            os.remove(photo.photo_url)
    except Exception as e:
        print(f"Failed to delete file: {e}")
    
    db.delete(photo)
    db.commit()
    
    return None
