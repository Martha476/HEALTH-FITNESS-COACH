"""
Proactive Suggestions Engine
Generates intelligent suggestions based on user activity patterns and goals.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from database.models import (
    User,
    UserStats,
    WorkoutSuggestion,
    WorkoutPlan,
)


class ProactiveSuggestionsEngine:
    """Generate intelligent proactive suggestions for users"""

    def __init__(self, db: Session):
        self.db = db

    def check_inactivity_and_suggest(self, user_id: str) -> Optional[WorkoutSuggestion]:
        """
        Check if user hasn't logged a workout in X days and suggest one.
        """
        # Get last workout
        last_workout = self.db.query(UserStats).filter(
            UserStats.user_id == user_id,
            UserStats.workout_minutes is not None,
        ).order_by(UserStats.recorded_date.desc()).first()

        if not last_workout:
            days_since_workout = 999
        else:
            days_since_workout = (datetime.utcnow() - last_workout.recorded_date).days

        # Suggest if 3+ days inactive
        if days_since_workout >= 3:
            suggestion_text = (
                f"You haven't logged a workout in {days_since_workout} days! "
                f"How about a quick 20-minute session to get back on track? 💪"
            )

            existing = self.db.query(WorkoutSuggestion).filter(
                WorkoutSuggestion.user_id == user_id,
                WorkoutSuggestion.reason == "no_workout_3_days",
                WorkoutSuggestion.accepted == False,
                WorkoutSuggestion.suggested_at >= datetime.utcnow() - timedelta(hours=24),
            ).first()

            if not existing:
                suggestion = WorkoutSuggestion(
                    id=str(__import__('uuid').uuid4()),
                    user_id=user_id,
                    suggestion_text=suggestion_text,
                    reason="no_workout_3_days",
                    suggested_at=datetime.utcnow(),
                )
                self.db.add(suggestion)
                self.db.commit()
                return suggestion

        return None

    def suggest_progressive_overload(self, user_id: str) -> Optional[WorkoutSuggestion]:
        """
        Suggest increasing intensity if user has been doing same routine for weeks.
        """
        # Get workouts from last 4 weeks
        four_weeks_ago = datetime.utcnow() - timedelta(days=28)
        recent_workouts = self.db.query(UserStats).filter(
            UserStats.user_id == user_id,
            UserStats.workout_minutes is not None,
            UserStats.recorded_date >= four_weeks_ago,
        ).all()

        if len(recent_workouts) < 8:  # Less than 2x per week
            return None

        # Check if average intensity has been consistent (not increasing)
        avg_minutes = sum([w.workout_minutes for w in recent_workouts]) / len(recent_workouts)
        min_minutes = min([w.workout_minutes for w in recent_workouts])
        max_minutes = max([w.workout_minutes for w in recent_workouts])

        # If very stable (range < 10% of avg), suggest increase
        if (max_minutes - min_minutes) < (avg_minutes * 0.1):
            suggestion_text = (
                f"You've been maintaining {avg_minutes:.0f}-minute workouts consistently! "
                f"Time to challenge yourself with progressive overload? "
                f"Try adding weight, increasing reps, or reducing rest time. 🚀"
            )

            existing = self.db.query(WorkoutSuggestion).filter(
                WorkoutSuggestion.user_id == user_id,
                WorkoutSuggestion.reason == "progressive_overload",
                WorkoutSuggestion.accepted == False,
                WorkoutSuggestion.suggested_at >= datetime.utcnow() - timedelta(days=7),
            ).first()

            if not existing:
                suggestion = WorkoutSuggestion(
                    id=str(__import__('uuid').uuid4()),
                    user_id=user_id,
                    suggestion_text=suggestion_text,
                    reason="progressive_overload",
                    suggested_at=datetime.utcnow(),
                )
                self.db.add(suggestion)
                self.db.commit()
                return suggestion

        return None

    def suggest_recovery_day(self, user_id: str) -> Optional[WorkoutSuggestion]:
        """
        Suggest a recovery day if user has worked out hard for consecutive days.
        """
        # Get last 7 days of workouts
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_workouts = self.db.query(UserStats).filter(
            UserStats.user_id == user_id,
            UserStats.workout_minutes is not None,
            UserStats.recorded_date >= week_ago,
        ).order_by(UserStats.recorded_date.desc()).all()

        if len(recent_workouts) < 5:
            return None

        # Check consecutive days
        consecutive_days = 0
        for i, workout in enumerate(recent_workouts):
            if i == 0:
                consecutive_days = 1
            else:
                prev_workout = recent_workouts[i - 1]
                days_diff = (prev_workout.recorded_date - workout.recorded_date).days
                if days_diff == 1:
                    consecutive_days += 1
                else:
                    break

        # Suggest recovery if 5+ consecutive days
        if consecutive_days >= 5:
            avg_intensity = sum([w.workout_minutes for w in recent_workouts[:5]]) / 5

            suggestion_text = (
                f"Impressive {consecutive_days} consecutive workout days! 🔥 "
                f"Your body needs recovery. How about active rest today? "
                f"Try yoga, stretching, or a casual walk. Recovery is when you grow! 🧘"
            )

            existing = self.db.query(WorkoutSuggestion).filter(
                WorkoutSuggestion.user_id == user_id,
                WorkoutSuggestion.reason == "recovery_day",
                WorkoutSuggestion.accepted == False,
                WorkoutSuggestion.suggested_at >= datetime.utcnow() - timedelta(days=1),
            ).first()

            if not existing:
                suggestion = WorkoutSuggestion(
                    id=str(__import__('uuid').uuid4()),
                    user_id=user_id,
                    suggestion_text=suggestion_text,
                    reason="recovery_day",
                    suggested_at=datetime.utcnow(),
                )
                self.db.add(suggestion)
                self.db.commit()
                return suggestion

        return None

    def get_next_suggestion(self, user_id: str) -> Optional[WorkoutSuggestion]:
        """
        Get the next proactive suggestion for the user.
        Prioritizes: inactivity > recovery > progressive overload
        """
        # Check inactivity first (highest priority)
        suggestion = self.check_inactivity_and_suggest(user_id)
        if suggestion:
            return suggestion

        # Check recovery needs
        suggestion = self.suggest_recovery_day(user_id)
        if suggestion:
            return suggestion

        # Check progressive overload opportunity
        suggestion = self.suggest_progressive_overload(user_id)
        if suggestion:
            return suggestion

        return None

    def get_all_pending_suggestions(self, user_id: str) -> List[WorkoutSuggestion]:
        """Get all unaccepted suggestions for the user"""
        suggestions = self.db.query(WorkoutSuggestion).filter(
            WorkoutSuggestion.user_id == user_id,
            WorkoutSuggestion.accepted == False,
        ).order_by(WorkoutSuggestion.suggested_at.desc()).all()

        return suggestions
