import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = 'AI Fitness and Nutrition Coach'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api'
    API_HOST: str = '0.0.0.0'
    API_PORT: int = 8000
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ['http://localhost:3000', 'https://your-app.vercel.app']
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = 'gpt-4o-mini'
    MAX_TOKENS: int = 1500
    TEMPERATURE: float = 0.7
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    database_url_sync: str = 'sqlite:///./fitness_coach.db'
    CURRENT_DIR: Path = Path(__file__).resolve().parent
    BASE_DIR: Path = CURRENT_DIR.parent
    STORAGE_DIR: str = str(BASE_DIR / 'storage' / 'users')
    OFF_BASE_URL: str = 'https://world.openfoodfacts.org'
    USER_AGENT: str = 'FitnessCoachApp/1.0'
    ENABLE_AUTH: bool = False
    ENABLE_LOGGING: bool = True
    ENABLE_RAG: bool = True
    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.getcwd(), '.env'),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'),
            os.path.join(os.path.dirname(__file__), '.env')
        ),
        env_file_encoding='utf-8',
        extra='ignore'
    )
settings = Settings()
