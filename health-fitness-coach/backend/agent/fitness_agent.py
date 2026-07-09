import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import date

from dotenv import load_dotenv

# Load .env explicitly — works regardless of where uvicorn is launched from
for candidate in [
    Path(__file__).resolve().parent.parent / ".env",   # backend/.env
    Path(__file__).resolve().parent.parent.parent / "backend" / ".env",  # project root → backend
    Path(".env"),                                        # cwd fallback
]:
    if candidate.exists():
        load_dotenv(candidate, override=False)
        break

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from agent.memory import MemoryManager

logger = logging.getLogger(__name__)


class FitnessCoachAgent:
    def __init__(self):
        self.memory = MemoryManager()
        self.api_key = os.getenv("OPENAI_API_KEY")

        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found. Agent will run in mock mode.")
            self.llm = None
        else:
            logger.info("OPENAI_API_KEY loaded. Agent initialised with gpt-4o-mini.")
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",   # cheaper + faster than gpt-4, still very capable
                temperature=0.7,
                api_key=self.api_key,  # pass explicitly — no ambiguity
            )

    def _format_nutrition_context(self, user_id: str) -> str:
        context = self.memory.get_context(user_id)
        meals = context.get("meals_log", [])
        today = date.today().isoformat()
        today_meals = [m for m in meals if m.get("logged_at", "").startswith(today)]

        if not today_meals:
            return "No meals logged yet today."

        summary = "Today's Meal Logs:\n"
        total_cal = 0
        for m in today_meals:
            summary += (
                f"- {m['meal_type'].capitalize()}: {m['name']} "
                f"({m['calories']} kcal, P: {m['protein_g']}g, "
                f"C: {m['carbs_g']}g, F: {m['fat_g']}g)\n"
            )
            total_cal += m["calories"]
        summary += f"\nTotal Daily Calories so far: {total_cal} kcal"
        return summary

    async def chat(
        self,
        message: str,
        user_profile: Dict[str, Any],
        settings: Any,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        user_id = user_profile.get("id", "default")

        if not self.llm:
            return {
                "response": (
                    "The AI coach is not configured yet. "
                    "Add OPENAI_API_KEY to backend/.env and restart the server."
                ),
                "tokenUsage": {"prompt": 0, "completion": 0, "total": 0},
                "metadata": {"error": "no_api_key"},
            }

        nutrition_context = self._format_nutrition_context(user_id)
        goals = user_profile.get("goals", [])
        goals_str = ", ".join(goals) if isinstance(goals, list) else str(goals)

        system_prompt = f"""You are a professional Health & Fitness Coach.
Provide actionable, encouraging, and science-based advice.

USER PROFILE:
- Name: {user_profile.get("name", "User")}
- Goals: {goals_str or "general fitness"}
- Fitness Level: {user_profile.get("fitness_level", "not specified")}
- Primary Goal: {user_profile.get("primary_goal", "general fitness")}

{nutrition_context}

Instructions:
- If the user asks about their diet, refer to the Meal Logs above.
- Be concise but friendly.
- Use {user_profile.get("preferredUnit", "metric")} units.
- Keep responses under 200 words unless detail is specifically requested."""

        messages = [SystemMessage(content=system_prompt)]
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        messages.append(HumanMessage(content=message))

        try:
            response = await self.llm.ainvoke(messages)

            self.memory.save_chat_message(user_id, "user", message)
            self.memory.save_chat_message(user_id, "assistant", response.content)

            token_usage = response.response_metadata.get("token_usage", {})
            return {
                "response": response.content,
                "tokenUsage": {
                    "prompt": token_usage.get("prompt_tokens", 0),
                    "completion": token_usage.get("completion_tokens", 0),
                    "total": token_usage.get("total_tokens", 0),
                },
                "metadata": {"model": "gpt-4o-mini"},
            }
        except Exception as e:
            logger.error(f"Agent Chat Error: {e}")
            return {
                "response": f"Sorry, I encountered an error: {str(e)}",
                "tokenUsage": {"prompt": 0, "completion": 0, "total": 0},
                "metadata": {"error": True},
            }