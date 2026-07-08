"""Backend module initialization"""

# Lazy imports to avoid import errors during testing
def get_settings():
    from config import settings
    return settings

def get_app():
    from api import app
    return app

def get_fitness_coach():
    from agent import create_fitness_coach_graph, MemoryManager
    return create_fitness_coach_graph, MemoryManager

__all__ = ["get_settings", "get_app", "get_fitness_coach"]

# Try to import for backwards compatibility
try:
    from config import settings
    from agent import create_fitness_coach_graph, MemoryManager
    from api import app
except Exception:
    # During testing, these imports might fail
    settings = None
    app = None
    create_fitness_coach_graph = None
    MemoryManager = None
