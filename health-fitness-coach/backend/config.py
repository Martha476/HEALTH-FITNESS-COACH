import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Application configuration"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── API Configuration ──────────────────────────────────────────────────────
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    DEBUG: bool   = os.getenv("DEBUG", "False").lower() == "true"

    # ── LLM Configuration ──────────────────────────────────────────────────────
    OPENAI_API_KEY:    str = os.getenv("OPENAI_API_KEY",    "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_API_KEY:    str = os.getenv("GOOGLE_API_KEY",    "")
    DEFAULT_LLM:       str = os.getenv("DEFAULT_LLM",       "openai")

    # ── LLM Models ─────────────────────────────────────────────────────────────
    OPENAI_MODEL:    str = os.getenv("OPENAI_MODEL",    "gpt-4")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-1-20250805")
    GOOGLE_MODEL:    str = os.getenv("GOOGLE_MODEL",    "gemini-1.5-pro")

    # ── Database Configuration ─────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///fitness_coach.db")

    # ── Redis Configuration ────────────────────────────────────────────────────
    REDIS_URL:    str  = os.getenv("REDIS_URL",    "redis://localhost:6379/0")
    ENABLE_CACHE: bool = os.getenv("ENABLE_CACHE", "True").lower() == "true"

    # ── Vector Database ────────────────────────────────────────────────────────
    ENABLE_RAG:           bool = os.getenv("ENABLE_RAG",           "True").lower() == "true"
    PINECONE_API_KEY:     str  = os.getenv("PINECONE_API_KEY",     "")
    PINECONE_INDEX:       str  = os.getenv("PINECONE_INDEX",       "fitness-coach")
    PINECONE_ENVIRONMENT: str  = os.getenv("PINECONE_ENVIRONMENT", "us-east1-aws")

    # ── LangSmith Configuration ────────────────────────────────────────────────
    ENABLE_LANGSMITH:  bool = os.getenv("ENABLE_LANGSMITH",  "False").lower() == "true"
    LANGSMITH_API_KEY: str  = os.getenv("LANGSMITH_API_KEY", "")
    LANGSMITH_PROJECT: str  = os.getenv("LANGSMITH_PROJECT", "health-fitness-coach")

    # ── Feature Flags ──────────────────────────────────────────────────────────
    ENABLE_AUTH:     bool = os.getenv("ENABLE_AUTH",     "False").lower() == "true"
    ENABLE_FEEDBACK: bool = os.getenv("ENABLE_FEEDBACK", "True").lower()  == "true"
    ENABLE_RETRY:    bool = os.getenv("ENABLE_RETRY",    "True").lower()  == "true"

    # ── Retry Configuration ────────────────────────────────────────────────────
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", 3))
    RETRY_DELAY: int = int(os.getenv("RETRY_DELAY", 1))

    # ── Token & Cost Tracking ──────────────────────────────────────────────────
    ENABLE_TOKEN_TRACKING: bool = os.getenv("ENABLE_TOKEN_TRACKING", "True").lower() == "true"

    # ── CORS Configuration ─────────────────────────────────────────────────────
    # Using ["*"] allows ALL origins — safe for local development.
    # For production, replace with specific domains.
    CORS_ORIGINS: list = ["*"]

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL"""
        return self.DATABASE_URL


settings = Settings()