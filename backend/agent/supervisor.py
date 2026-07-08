from .nutrition import NutritionAgent
from .workout import WorkoutAgent
from .progress import ProgressAgent
from .health import HealthAgent
from .tools import *

class SupervisorAgent:
    def __init__(self):
        self.nutrition_agent = NutritionAgent()
        self.workout_agent = WorkoutAgent()
        self.progress_agent = ProgressAgent()
        self.health_agent = HealthAgent()

    def route(self, user_message, user_profile):
        """
        Simple keyword-based routing. Replace with LLM-based intent detection for production.
        """
        msg = user_message.lower()
        responses = []
        if any(word in msg for word in ["meal", "calorie", "protein", "food", "eat", "diet", "breakfast", "lunch", "dinner", "nutrition", "macro", "vegan"]):
            responses.append(self.nutrition_agent.handle(user_message, user_profile))
        if any(word in msg for word in ["workout", "exercise", "train", "gym", "muscle", "strength", "cardio", "plan", "routine"]):
            responses.append(self.workout_agent.handle(user_message, user_profile))
        if any(word in msg for word in ["progress", "weight", "track", "chart", "goal", "trend", "history", "log"]):
            responses.append(self.progress_agent.handle(user_message, user_profile))
        if any(word in msg for word in ["injury", "pain", "health", "condition", "recovery", "overtrain", "water", "hydration", "safe", "ill", "sick"]):
            responses.append(self.health_agent.handle(user_message, user_profile))
        if not responses:
            # Default: try all
            responses.append(self.nutrition_agent.handle(user_message, user_profile))
            responses.append(self.workout_agent.handle(user_message, user_profile))
        return "\n\n".join([r for r in responses if r])
