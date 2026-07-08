"""
Water Intake Tracking API
Simple water logging with daily goal progress tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import uuid

from database import get_db
from database.models import User, WaterIntake
from api.schemas import WaterIntakeRequest, WaterIntakeResponse
from api.auth import get_current_user

router = APIRouter(prefix="/api/water-intake", tags=["water-intake"])


@router.post("", response_model=WaterIntakeResponse)
async def log_water_intake(
    request: WaterIntakeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log water intake (in glasses or ounces)"""
    
    # Convert glasses to ounces if not provided
    ounces = request.ounces if request.ounces else (request.glasses * 8)
    
    # Get or create today's water log
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    existing_log = db.query(WaterIntake).filter(
        WaterIntake.user_id == current_user.id,
        WaterIntake.logged_date >= today_start,
        WaterIntake.logged_date <= today_end,
    ).first()
    
    if existing_log:
        # Update existing log
        existing_log.glasses += request.glasses
        existing_log.ounces += ounces
        db.commit()
        db.refresh(existing_log)
        water_log = existing_log
    else:
        # Create new log
        water_log = WaterIntake(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            glasses=request.glasses,
            ounces=ounces,
        )
        db.add(water_log)
        db.commit()
        db.refresh(water_log)
    
    percentage = (water_log.ounces / water_log.daily_goal_ounces * 100) if water_log.daily_goal_ounces else 0
    
    return WaterIntakeResponse(
        id=water_log.id,
        glasses=water_log.glasses,
        ounces=water_log.ounces,
        daily_goal_ounces=water_log.daily_goal_ounces,
        percentage_of_goal=min(100, percentage),
        logged_date=water_log.logged_date,
    )


@router.get("/today", response_model=WaterIntakeResponse)
async def get_today_water_intake(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's water intake progress"""
    
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    water_log = db.query(WaterIntake).filter(
        WaterIntake.user_id == current_user.id,
        WaterIntake.logged_date >= today_start,
        WaterIntake.logged_date <= today_end,
    ).first()
    
    if not water_log:
        # Return empty log for today
        water_log = WaterIntake(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            glasses=0,
            ounces=0.0,
        )
    
    percentage = (water_log.ounces / water_log.daily_goal_ounces * 100) if water_log.daily_goal_ounces else 0
    
    return WaterIntakeResponse(
        id=water_log.id,
        glasses=water_log.glasses,
        ounces=water_log.ounces,
        daily_goal_ounces=water_log.daily_goal_ounces,
        percentage_of_goal=min(100, percentage),
        logged_date=water_log.logged_date,
    )


@router.get("/history", response_model=List[WaterIntakeResponse])
async def get_water_intake_history(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get water intake history for specified days"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    logs = db.query(WaterIntake).filter(
        WaterIntake.user_id == current_user.id,
        WaterIntake.logged_date >= start_date,
    ).order_by(WaterIntake.logged_date.desc()).all()
    
    result = []
    for log in logs:
        percentage = (log.ounces / log.daily_goal_ounces * 100) if log.daily_goal_ounces else 0
        result.append(WaterIntakeResponse(
            id=log.id,
            glasses=log.glasses,
            ounces=log.ounces,
            daily_goal_ounces=log.daily_goal_ounces,
            percentage_of_goal=min(100, percentage),
            logged_date=log.logged_date,
        ))
    
    return result


@router.put("/goal", status_code=status.HTTP_200_OK)
async def update_daily_water_goal(
    daily_goal_ounces: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update daily water intake goal"""
    
    if daily_goal_ounces <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily goal must be positive",
        )
    
    # Update all water logs for this user
    db.query(WaterIntake).filter(
        WaterIntake.user_id == current_user.id,
    ).update({"daily_goal_ounces": daily_goal_ounces})
    
    db.commit()
    
    return {"message": f"Daily water goal updated to {daily_goal_ounces} oz"}
