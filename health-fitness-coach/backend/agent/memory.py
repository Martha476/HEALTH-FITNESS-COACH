"""
Memory management for the Health Fitness Coach Agent.

Implements:
- Short-term memory (conversation context)
- Long-term memory (user history and preferences)
- Memory retrieval and relevance ranking
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import json
import hashlib


class MemoryManager:
    """Manage short-term and long-term memory for the fitness coach"""
    
    def __init__(self):
        """Initialize memory manager"""
        self.short_term_memory: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.long_term_memory: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self.user_preferences: Dict[str, Dict[str, Any]] = defaultdict(dict)
    
    def add_message(
        self,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Add message to short-term memory"""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {},
        }
        
        self.short_term_memory[user_id].append(message)
        
        # Keep only last 50 messages in short-term memory
        if len(self.short_term_memory[user_id]) > 50:
            self.short_term_memory[user_id] = self.short_term_memory[user_id][-50:]
    
    def get_conversation_history(
        self, user_id: str, limit: int = 10
    ) -> List[Dict[str, str]]:
        """Get recent conversation history"""
        messages = self.short_term_memory.get(user_id, [])
        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in messages[-limit:]
        ]
    
    def save_user_context(
        self,
        user_id: str,
        profile: Dict[str, Any],
        preferences: Dict[str, Any],
    ) -> None:
        """Save user context to long-term memory"""
        self.long_term_memory[user_id] = {
            "profile": profile,
            "updated_at": datetime.now().isoformat(),
        }
        
        self.user_preferences[user_id] = preferences
    
    def get_context(self, user_id: str) -> Dict[str, Any]:
        """Get user context for the agent"""
        return {
            "profile": self.long_term_memory.get(user_id, {}).get("profile", {}),
            "preferences": self.user_preferences.get(user_id, {}),
            "recent_messages": self.get_conversation_history(user_id, limit=5),
        }
    
    def remember_goal(
        self, user_id: str, goal: str, timeline_days: Optional[int] = None
    ) -> None:
        """Remember a user's fitness goal"""
        if "goals" not in self.long_term_memory[user_id]:
            self.long_term_memory[user_id]["goals"] = []
        
        self.long_term_memory[user_id]["goals"].append({
            "goal": goal,
            "timeline_days": timeline_days,
            "created_at": datetime.now().isoformat(),
        })
    
    def remember_preference(self, user_id: str, key: str, value: Any) -> None:
        """Remember a user preference"""
        self.user_preferences[user_id][key] = value
    
    def get_preference(self, user_id: str, key: str, default: Any = None) -> Any:
        """Get a user preference"""
        return self.user_preferences.get(user_id, {}).get(key, default)
    
    def extract_user_info(self, message: str) -> Dict[str, Any]:
        """
        Extract user information from messages.
        
        Useful for automatically updating user profile during conversation.
        """
        extracted = {}
        
        # Simple keyword matching (in production, use NLP)
        message_lower = message.lower()
        
        if "goal" in message_lower or "want to" in message_lower:
            extracted["mentioned_goal"] = True
        
        if "injury" in message_lower or "pain" in message_lower or "hurt" in message_lower:
            extracted["mentioned_injury"] = True
        
        if "beginner" in message_lower:
            extracted["fitness_level"] = "beginner"
        elif "intermediate" in message_lower:
            extracted["fitness_level"] = "intermediate"
        elif "advanced" in message_lower:
            extracted["fitness_level"] = "advanced"
        
        return extracted
    
    def update_stats(self, user_id: str, stats: Dict[str, Any]) -> None:
        """Update user fitness stats"""
        if "stats" not in self.long_term_memory[user_id]:
            self.long_term_memory[user_id]["stats"] = []
        
        stats["timestamp"] = datetime.now().isoformat()
        self.long_term_memory[user_id]["stats"].append(stats)
    
    def get_stats(self, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get user stats from the last N days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        all_stats = self.long_term_memory.get(user_id, {}).get("stats", [])
        
        return [
            stat for stat in all_stats
            if datetime.fromisoformat(stat["timestamp"]) > cutoff_date
        ]
    
    def summarize_interaction(
        self, user_id: str, session_data: Dict[str, Any]
    ) -> str:
        """Create a summary of the interaction for future context"""
        summary_parts = []
        
        if "topics" in session_data:
            summary_parts.append(f"Topics discussed: {', '.join(session_data['topics'])}")
        
        if "goals_mentioned" in session_data:
            summary_parts.append(f"Goals: {', '.join(session_data['goals_mentioned'])}")
        
        if "preferences" in session_data:
            summary_parts.append(f"Preferences: {', '.join([f'{k}={v}' for k, v in session_data['preferences'].items()])}")
        
        summary = "\n".join(summary_parts)
        
        # Store in long-term memory
        if "session_summaries" not in self.long_term_memory[user_id]:
            self.long_term_memory[user_id]["session_summaries"] = []
        
        self.long_term_memory[user_id]["session_summaries"].append({
            "summary": summary,
            "timestamp": datetime.now().isoformat(),
        })
        
        return summary
    
    def clear_user_memory(self, user_id: str, keep_long_term: bool = True) -> None:
        """Clear user memory to start fresh"""
        if user_id in self.short_term_memory:
            del self.short_term_memory[user_id]
        
        if not keep_long_term:
            if user_id in self.long_term_memory:
                del self.long_term_memory[user_id]
            if user_id in self.user_preferences:
                del self.user_preferences[user_id]
