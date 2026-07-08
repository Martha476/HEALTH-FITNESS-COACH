import os
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryManager:
    def __init__(self, storage_dir: str = "storage/users"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, user_id: str) -> Path:
        return self.storage_dir / f"{user_id}.json"

    def get_context(self, user_id: str) -> Dict[str, Any]:
        """Retrieve the full user context (Profile + Logs + Settings)."""
        file_path = self._get_file_path(user_id)
        if not file_path.exists():
            # Initial schema including all necessary trackers
            return {
                "profile": {},
                "meals_log": [],
                "stats": [],
                "history": [],
                "settings": {}
            }
        
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading memory for {user_id}: {e}")
            return {}

    def save_user_context(self, user_id: str, new_data: Dict[str, Any], settings: Optional[Any] = None):
        """
        Performs a merge of new data into the existing user context to prevent data loss.
        """
        # 1. Load existing data to merge into
        current_context = self.get_context(user_id)

        # 2. Key-based merge logic
        # Includes 'history' and 'meals_log' so background logging doesn't overwrite chat
        trackable_keys = ["profile", "meals_log", "stats", "history"]
        for key in trackable_keys:
            if key in new_data:
                current_context[key] = new_data[key]
        
        # 3. Handle Settings object (Pydantic compatibility)
        if settings:
            current_context["settings"] = settings.model_dump() if hasattr(settings, "model_dump") else settings
        elif "settings" in new_data:
            current_context["settings"] = new_data["settings"]

        # 4. Persist updated context to disk
        try:
            file_path = self._get_file_path(user_id)
            with open(file_path, "w") as f:
                json.dump(current_context, f, indent=4)
            logger.info(f"Memory successfully persisted for user: {user_id}")
        except Exception as e:
            logger.error(f"Failed to save memory for {user_id}: {e}")

    def get_conversation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, str]]:
        """Retrieve recent chat history from the user context."""
        context = self.get_context(user_id)
        return context.get("history", [])[-limit:]

    def save_chat_message(self, user_id: str, role: str, content: str):
        """Append a single message to the persistent chat history."""
        context = self.get_context(user_id)
        history = context.setdefault("history", [])
        history.append({"role": role, "content": content})
        
        # Trigger save with updated history list
        self.save_user_context(user_id, {"history": history})