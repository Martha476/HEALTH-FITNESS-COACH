"""Pytest configuration and fixtures for backend tests"""

import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add parent directory to path
backend_dir = str(Path(__file__).parent.parent)
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

# Set up environment BEFORE any app imports
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")

from database.models import Base, User, UserSettings, UserStats
from database import get_db

# Import app gracefully
app = None
try:
    from api.main import app as imported_app
    app = imported_app
except Exception as e:
    import traceback
    print(f"ERROR: Could not import app: {e}")
    print(f"Traceback: {traceback.format_exc()}")
    from fastapi import FastAPI
    app = FastAPI()

# ── Database Setup ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def test_db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def test_db_session(test_db_engine):
    connection  = test_db_engine.connect()
    transaction = connection.begin()
    session     = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
    yield session
    session.close()
    try:
        transaction.rollback()
    except Exception:
        pass
    connection.close()


@pytest.fixture
def client(test_db_session):
    # httpx ≥ 0.25 changed TestClient — import here so the error is localised
    try:
        from fastapi.testclient import TestClient
    except ImportError:
        from starlette.testclient import TestClient

    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db

    # TestClient(app=app) works for older httpx; TestClient(app) for newer
    try:
        with TestClient(app=app) as test_client:
            yield test_client
    except TypeError:
        # Fallback for newer starlette that dropped the `app` kwarg
        client_obj = TestClient.__new__(TestClient)
        # Use base_url approach
        import httpx
        with httpx.Client(app=app, base_url="http://testserver") as test_client:
            yield test_client

    app.dependency_overrides.clear()


# ── Test Data Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def test_user(test_db_session):
    from bcrypt import hashpw, gensalt
    user = User(
        id="test-user-001",
        name="Test User",
        email="test@example.com",
        password_hash=hashpw(b"testpassword123", gensalt()).decode(),
        age=30,
        gender="male",
        weight_lbs=180.0,
        height_inches=72.0,
        fitness_level="intermediate",
        goals=["lose_weight", "build_muscle"],
        injuries=None,
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def test_user_settings(test_db_session, test_user):
    import uuid
    # Use only columns that actually exist in UserSettings model
    settings = UserSettings(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        theme="light",
        notifications=True,
        units="imperial",
        language="en",
        personality="friendly",
    )
    test_db_session.add(settings)
    test_db_session.commit()
    test_db_session.refresh(settings)
    return settings


@pytest.fixture
def test_user_stats(test_db_session, test_user):
    import uuid
    stats = UserStats(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        weight_lbs=180.0,
        body_fat_percent=18.5,
        workout_minutes=150,
        notes="Initial stats",
    )
    test_db_session.add(stats)
    test_db_session.commit()
    test_db_session.refresh(stats)
    return stats