from .tools import *

class ProgressAgent:
    def handle(self, user_message, user_profile):
        if "progress" in user_message or "track" in user_message:
            return get_progress_data(user_profile)
        if "log" in user_message and "weight" in user_message:
            return log_weight(user_profile, user_message)
        if "analyze" in user_message:
            return analyze_progress(user_profile)
        return "ProgressAgent: Sorry, I couldn't understand your progress request."