from .tools import *

class WorkoutAgent:
    def handle(self, user_message, user_profile):
        if "log" in user_message and "workout" in user_message:
            return log_workout(user_profile, user_message)
        if "plan" in user_message or "workout" in user_message:
            return generate_workout_plan(user_profile)
        if "exercise" in user_message or "how do i" in user_message:
            return search_exercise_database(user_profile, user_message)
        return "WorkoutAgent: Sorry, I couldn't understand your workout request." 