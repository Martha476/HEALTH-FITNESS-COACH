from .tools import *

class NutritionAgent:
    def handle(self, user_message, user_profile):
        # Example: Route to the right tool based on message
        if "log" in user_message and "meal" in user_message:
            return log_meal(user_profile, user_message)
        if "calorie" in user_message or "macro" in user_message:
            return get_daily_nutrition(user_profile)
        if "plan" in user_message or "meal" in user_message:
            return generate_meal_plan(user_profile)
        return "NutritionAgent: Sorry, I couldn't understand your nutrition request."