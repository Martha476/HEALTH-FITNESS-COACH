from .tools import *

class HealthAgent:
    def handle(self, user_message, user_profile):
        if "pain" in user_message or "injury" in user_message:
            return search_health_knowledge(user_profile, user_message)
        if "water" in user_message or "hydration" in user_message:
            return get_hydration_recommendation(user_profile)
        if "bmi" in user_message:
            return calculate_bmi(user_profile)
        return "HealthAgent: Sorry, I couldn't understand your health request."