"""
Proactive Suggestions API
Provides intelligent suggestions to users based on their activity patterns.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from database.models import User, WorkoutSuggestion
from api.schemas import WorkoutSuggestionResponse
from api.auth import get_current_user
from agent.proactive_suggestions import ProactiveSuggestionsEngine

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


@router.get("/next", response_model=WorkoutSuggestionResponse)
async def get_next_suggestion(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the next proactive suggestion for the user"""

    engine = ProactiveSuggestionsEngine(db)
    suggestion = engine.get_next_suggestion(current_user.id)

    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No suggestions at this time",
        )

    return WorkoutSuggestionResponse(
        id=suggestion.id,
        suggestion_text=suggestion.suggestion_text,
        reason=suggestion.reason,
        accepted=suggestion.accepted,
        suggested_at=suggestion.suggested_at,
    )


@router.get("/pending", response_model=List[WorkoutSuggestionResponse])
async def get_pending_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all unaccepted suggestions for the user"""

    engine = ProactiveSuggestionsEngine(db)
    suggestions = engine.get_all_pending_suggestions(current_user.id)

    return [
        WorkoutSuggestionResponse(
            id=s.id,
            suggestion_text=s.suggestion_text,
            reason=s.reason,
            accepted=s.accepted,
            suggested_at=s.suggested_at,
        )
        for s in suggestions
    ]


@router.post("/{suggestion_id}/accept", status_code=status.HTTP_200_OK)
async def accept_suggestion(
    suggestion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a suggestion as accepted"""

    suggestion = db.query(WorkoutSuggestion).filter(
        WorkoutSuggestion.id == suggestion_id,
        WorkoutSuggestion.user_id == current_user.id,
    ).first()

    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found",
        )

    from datetime import datetime
    suggestion.accepted = True
    suggestion.accepted_at = datetime.utcnow()
    db.commit()

    return {"message": "Suggestion accepted", "id": suggestion.id}


@router.post("/{suggestion_id}/dismiss", status_code=status.HTTP_200_OK)
async def dismiss_suggestion(
    suggestion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dismiss a suggestion (don't show again for this type)"""

    suggestion = db.query(WorkoutSuggestion).filter(
        WorkoutSuggestion.id == suggestion_id,
        WorkoutSuggestion.user_id == current_user.id,
    ).first()

    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found",
        )

    db.delete(suggestion)
    db.commit()

    return {"message": "Suggestion dismissed"}
