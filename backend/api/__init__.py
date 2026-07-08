"""API module initialization"""

# Lazy imports to avoid circular dependencies during testing
def get_app():
    """Lazy load the FastAPI app"""
    from .main import app
    return app

try:
    # Try to import for backwards compatibility
    from .main import app
    from .schemas import (
        ChatRequest,
        ChatResponse,
        Settings,
        UserProfile,
    )
except Exception:
    # During testing, these imports might fail due to missing config
    pass

__all__ = ["app", "ChatRequest", "ChatResponse", "Settings", "UserProfile"]
