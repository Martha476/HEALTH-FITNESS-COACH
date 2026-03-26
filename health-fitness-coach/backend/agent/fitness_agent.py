"""
Fitness Coach Agent using LangGraph.

This implements a state machine-based agent using LangGraph that:
- Routes user queries to appropriate tools
- Maintains conversation state
- Integrates memory (short and long-term)
- Supports multiple LLM models
- Includes retry logic and error handling
- Tracks token usage
- Integrates with LangSmith for observability
"""

from typing import Any, Dict, List, Optional, TypedDict
from datetime import datetime
import json
import asyncio
import os

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END

from config import settings
from .prompts import SYSTEM_PROMPTS, TOOLS_PROMPT, RAG_SYSTEM_PROMPT
from .tools import (
    generate_workout_plan,
    calculate_nutrition,
    analyze_progress,
    search_exercises,
    track_goals,
)
from .memory import MemoryManager
from .rag import get_knowledge_base
from .supervisor import SupervisorAgent

# Initialize LangSmith if enabled
if settings.ENABLE_LANGSMITH and settings.LANGSMITH_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT


class AgentState(TypedDict):
    """State for the fitness coach agent"""
    messages: List[Dict[str, str]]
    user_profile: Dict[str, Any]
    current_goals: List[str]
    memory: Optional[Dict[str, Any]]
    tool_use: str
    response: Optional[str]
    token_count: int
    metadata: Dict[str, Any]


# FIX 2: Read ALL settings from the request's settings_dict
# so user changes in the Settings page are applied to every response
def initialize_llm(settings_dict: Dict[str, Any]):
    """
    Initialize the LLM based on settings passed from the request.
    FIX 2: All parameters come from settings_dict (the user's saved
    settings), NOT from the global config — so changes made in the
    Settings page are immediately reflected.
    """
    # FIX 2: Read from request settings first, fall back to config
    llm_choice = (
        settings_dict.get("llm")
        or settings_dict.get("llm_model")
        or settings.DEFAULT_LLM
    )
    temp = settings_dict.get("temperature", 0.7)
    top_p = settings_dict.get("topP", settings_dict.get("top_p", 0.9))
    freq_penalty = settings_dict.get(
        "frequencyPenalty",
        settings_dict.get("frequency_penalty", 0.0)
    )
    # FIX 2: Read personality from settings (used in prompt selection)
    personality = settings_dict.get("personality", "friendly")

    if llm_choice == "anthropic":
        if (
            not settings.ANTHROPIC_API_KEY
            or settings.ANTHROPIC_API_KEY.startswith("your-")
        ):
            raise ValueError("Valid Anthropic API key required")
        return ChatAnthropic(
            model=settings.ANTHROPIC_MODEL,
            temperature=temp,
            api_key=settings.ANTHROPIC_API_KEY,
        )

    elif llm_choice == "google":
        # Google Gemini — fall back to OpenAI if not configured
        if (
            not settings.GOOGLE_API_KEY
            or settings.GOOGLE_API_KEY.startswith("your-")
        ):
            print("Google API key not configured — falling back to OpenAI")
            llm_choice = "openai"
        else:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model=settings.GOOGLE_MODEL,
                    temperature=temp,
                    google_api_key=settings.GOOGLE_API_KEY,
                )
            except ImportError:
                print("langchain-google-genai not installed — falling back to OpenAI")
                llm_choice = "openai"

    # Default: OpenAI
    if (
        not settings.OPENAI_API_KEY
        or settings.OPENAI_API_KEY.startswith("your-")
    ):
        raise ValueError("Valid OpenAI API key required")

    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        temperature=temp,
        top_p=top_p,
        api_key=settings.OPENAI_API_KEY,
        model_kwargs={"frequency_penalty": freq_penalty},
    )


def create_fitness_coach_graph(memory_manager: MemoryManager):
    """Create the LangGraph state machine for the fitness coach"""

    # Create the graph
    workflow = StateGraph(AgentState)

    def process_user_input(state: AgentState) -> AgentState:
        """Process user input and determine next action"""
        return state

    def generate_coach_response(
        state: AgentState, settings_dict: Dict[str, Any]
    ) -> AgentState:
        """
        Generate response from the fitness coach.
        FIX 2: Uses settings_dict from the request so personality,
        model, temperature etc. all reflect the user's saved settings.
        """
        # FIX 2: Initialize LLM from request settings
        try:
            llm = initialize_llm(settings_dict)
        except ValueError as e:
            state["response"] = (
                "Hello! I'm your AI Fitness Coach.\n\n"
                "Note: I need a valid API key to provide personalised AI coaching. "
                "Please configure your API key in the backend .env file to enable "
                "full AI capabilities.\n\n"
                "In the meantime, you can still use other features of this app!"
            )
            state["token_count"] = 0
            return state

        kb = get_knowledge_base()
        messages = []

        # FIX 2: Use personality from settings_dict (user's choice)
        personality = settings_dict.get("personality", "friendly")
        system_prompt = SYSTEM_PROMPTS.get(personality, SYSTEM_PROMPTS["friendly"])

        # FIX 2: Build user profile context into system prompt
        user_profile = state.get("user_profile", {})
        if user_profile:
            profile_context = (
                "\n\nUSER PROFILE — use this to personalise ALL responses. "
                "NEVER ask for information already provided here:\n"
                f"- Name: {user_profile.get('name', 'User')}\n"
                f"- Age: {user_profile.get('age', 'Unknown')}\n"
                f"- Weight: {user_profile.get('weight_lbs', user_profile.get('weight', 'Unknown'))}\n"
                f"- Height: {user_profile.get('height', 'Unknown')}\n"
                f"- Fitness Goal: {user_profile.get('primary_goal', user_profile.get('goals', 'General fitness'))}\n"
                f"- Activity Level: {user_profile.get('activity_level', 'Moderate')}\n"
                f"- Fitness Level: {user_profile.get('fitness_level', 'Beginner')}\n"
                f"- Dietary Type: {user_profile.get('dietary_type', 'No restriction')}\n"
                f"- Food Allergies: {user_profile.get('food_allergies', 'None')}\n"
                f"- Injuries: {user_profile.get('injuries', 'None')}\n"
                f"- Equipment: {user_profile.get('equipment_available', 'None')}\n"
                f"- Daily Calorie Goal: {user_profile.get('daily_calorie_goal', 'Not set')}\n"
                f"- Workout Days/Week: {user_profile.get('workout_days_per_week', 3)}\n"
                f"- Preferred Workout: {user_profile.get('preferred_workout', 'Mixed')}\n"
            )
            system_prompt = profile_context + "\n\n" + system_prompt

        # Add RAG context if enabled
        if settings.ENABLE_RAG:
            try:
                last_message = (
                    state.get("messages", [])[-1]["content"]
                    if state.get("messages")
                    else ""
                )
                rag_context = kb.get_context_for_query(last_message)
                if rag_context:
                    system_prompt = (
                        RAG_SYSTEM_PROMPT
                        + "\n\n"
                        + rag_context
                        + "\n\n"
                        + system_prompt
                    )
            except Exception:
                pass  # Continue without RAG if it fails

        messages.append(SystemMessage(content=system_prompt + "\n\n" + TOOLS_PROMPT))

        # Add memory context
        user_id = user_profile.get("id", "default")
        memory_context = memory_manager.get_context(user_id)
        if memory_context:
            messages.append(
                SystemMessage(
                    content=f"User context:\n{json.dumps(memory_context, indent=2)}"
                )
            )

        # Add conversation history (last 10 messages)
        for msg in state.get("messages", [])[-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))

        # Generate response
        try:
            response = llm.invoke(messages)
            state["response"] = response.content
            state["token_count"] = getattr(
                response, "usage_metadata", {}
            ).get("total_tokens", 0)
        except Exception as e:
            error_msg = str(e)
            if "401" in error_msg or "authentication" in error_msg.lower():
                state["response"] = (
                    "Authentication Error: The API key appears to be invalid "
                    "or has expired. Please check your API key configuration."
                )
            elif "rate_limit" in error_msg.lower() or "429" in error_msg:
                state["response"] = (
                    "Rate limit exceeded. Please wait a moment and try again."
                )
            else:
                state["response"] = (
                    "I apologize, but I encountered an error processing your "
                    "request. Please try again or check the backend configuration."
                )
            state["token_count"] = 0

        return state

    # Add nodes
    workflow.add_node("process_input", process_user_input)
    workflow.add_node(
        "generate_response",
        # FIX 2: Pass metadata (settings_dict) into generate_coach_response
        lambda state: generate_coach_response(state, state.get("metadata", {})),
    )

    # Add edges
    workflow.add_edge("process_input", "generate_response")
    workflow.add_edge("generate_response", END)

    # Set entry point
    workflow.set_entry_point("process_input")

    return workflow.compile()


class FitnessCoachAgent:
    """Main agent class for the Health Fitness Coach"""

    def __init__(self):
        self.memory_manager = MemoryManager()
        self.graph = create_fitness_coach_graph(self.memory_manager)
        self.supervisor = SupervisorAgent()

    async def chat(
        self,
        message: str,
        user_profile: Dict[str, Any],
        settings: Any,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        if history is None:
            history = []

        # Handle both dict and Settings object
        if isinstance(settings, dict):
            enable_retry = settings.get("ENABLE_RETRY", True)
        else:
            enable_retry = getattr(settings, "ENABLE_RETRY", True)

        if enable_retry:
            return await self._chat_with_retry(
                message, user_profile, settings, history
            )
        else:
            return await self._chat_once(
                message, user_profile, settings, history
            )

    async def _chat_with_retry(
        self,
        message: str,
        user_profile: Dict[str, Any],
        settings_obj: Any,
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Execute chat with exponential backoff retry"""
        last_exception = None

        # Handle both dict and Settings object
        if isinstance(settings_obj, dict):
            max_retries = settings_obj.get("MAX_RETRIES", 3)
            retry_delay = settings_obj.get("RETRY_DELAY", 1)
            settings_dict = settings_obj
        else:
            max_retries = getattr(settings_obj, "MAX_RETRIES", 3)
            retry_delay = getattr(settings_obj, "RETRY_DELAY", 1)
            settings_dict = (
                settings_obj.model_dump()
                if hasattr(settings_obj, "model_dump")
                else vars(settings_obj)
            )

        for attempt in range(max_retries):
            try:
                return await self._chat_once(
                    message, user_profile, settings_dict, history
                )
            except Exception as e:
                last_exception = e
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    print(
                        f"Attempt {attempt + 1} failed: {str(e)}. "
                        f"Retrying in {wait_time}s..."
                    )
                    await asyncio.sleep(wait_time)
                else:
                    print(f"All {max_retries} attempts failed.")

        return {
            "response": (
                "I apologize, but I'm experiencing technical difficulties. "
                f"Error: {str(last_exception)}"
            ),
            "tokenUsage": {
                "total": 0,
                "cost": 0,
                "prompt": 0,
                "completion": 0,
            },
            "metadata": {
                "error": str(last_exception),
                "retries": max_retries,
            },
        }

    async def _chat_once(
        self,
        message: str,
        user_profile: Dict[str, Any],
        settings_dict: Dict[str, Any],
        history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Single chat execution without retry"""
        # FIX 2: settings_dict is passed as metadata so the graph
        # node can read llm, temperature, personality etc. from it
        state: AgentState = {
            "messages": [
                *history,
                {"role": "user", "content": message},
            ],
            "user_profile": user_profile,
            "current_goals": user_profile.get("goals", []),
            "memory": None,
            "tool_use": "",
            "response": None,
            "token_count": 0,
            "metadata": settings_dict,  # FIX 2: full settings dict here
        }

        # Run the agent graph
        result = self.graph.invoke(state)

        # Save to memory
        user_id = user_profile.get("id", "default")
        self.memory_manager.add_message(
            user_id=user_id,
            role="user",
            content=message,
        )
        self.memory_manager.add_message(
            user_id=user_id,
            role="assistant",
            content=result.get("response", ""),
        )

        # Calculate cost
        token_count = result.get("token_count", 0)
        cost = self._calculate_cost(
            token_count,
            settings_dict.get("llm", "openai"),
        )

        return {
            "response": result.get("response", ""),
            "tokenUsage": {
                "total": token_count,
                "prompt": int(token_count * 0.3),
                "completion": int(token_count * 0.7),
                "cost": cost,
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "model": settings_dict.get("llm", "openai"),
                "personality": settings_dict.get("personality", "friendly"),
                "temperature": settings_dict.get("temperature", 0.7),
            },
        }

    @staticmethod
    def _calculate_cost(tokens: int, model: str) -> float:
        """Calculate the estimated cost of API usage"""
        costs = {
            "openai":    {"input": 0.00003,  "output": 0.00006},
            "anthropic": {"input": 0.00003,  "output": 0.00015},
            "google":    {"input": 0.000075, "output": 0.0003},
        }
        c = costs.get(model, costs["openai"])
        return (tokens * 0.3 * c["input"]) + (tokens * 0.7 * c["output"])