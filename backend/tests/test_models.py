"""Database Model Tests - Verify data models and relationships"""

import uuid
import pytest
from datetime import datetime
from database.models import User, UserSettings, UserStats, Conversation, Feedback


class TestUserModel:
    """Test User model creation and validation"""

    def test_create_user(self, test_db_session):
        user = User(
            id="user-002",
            name="John Doe",
            email="john@example.com",
            age=25,
            gender="male",
            weight_lbs=180.0,
            height_inches=72.0,
            fitness_level="beginner",
            goals=["lose_weight"],
        )
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)

        assert user.id == "user-002"
        assert user.name == "John Doe"
        assert user.email == "john@example.com"
        assert user.fitness_level == "beginner"

    def test_user_timestamps(self, test_db_session):
        user = User(
            id="user-003",
            name="Jane Doe",
            email="jane@example.com",
        )
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)

        assert user.created_at is not None
        assert user.updated_at is not None
        assert isinstance(user.created_at, datetime)

    def test_user_json_fields(self, test_db_session):
        goals    = ["build_muscle", "improve_endurance"]
        injuries = {"knee": "mild_pain", "shoulder": "stiffness"}

        user = User(
            id="user-004",
            name="Test User",
            email="test-json@example.com",
            goals=goals,
            injuries=injuries,
        )
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)

        assert user.goals == goals
        assert user.injuries == injuries

    def test_user_optional_fields(self, test_db_session):
        user = User(
            id="user-005",
            name="Minimal User",
            email="minimal@example.com",
        )
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)

        assert user.age is None
        assert user.weight_lbs is None
        assert user.fitness_level is None


class TestUserSettingsModel:
    """Test UserSettings model"""

    def test_create_user_settings(self, test_db_session, test_user):
        """Test creating user settings using actual model columns."""
        settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            theme="dark",
            language="en",
            units="metric",
            notifications=True,       # ✅ real column (not notifications_enabled)
            personality="friendly",
            llm="openai",
            temperature=0.7,
            enableCache=True,
            enableTools=True,
        )
        test_db_session.add(settings)
        test_db_session.commit()
        test_db_session.refresh(settings)

        assert settings.id is not None
        assert settings.user_id == test_user.id
        assert settings.theme == "dark"
        assert settings.notifications is True
        assert settings.personality == "friendly"
        assert settings.units == "metric"

    def test_update_user_settings(self, test_db_session, test_user_settings):
        """Test updating user settings using direct column assignment."""
        # ✅ UserSettings has no .preferences dict — set columns directly
        test_user_settings.theme         = "light"
        test_user_settings.units         = "imperial"
        test_user_settings.notifications = False
        test_db_session.commit()
        test_db_session.refresh(test_user_settings)

        assert test_user_settings.theme == "light"
        assert test_user_settings.units == "imperial"
        assert test_user_settings.notifications is False


class TestUserStatsModel:
    """Test UserStats model"""

    def test_create_user_stats(self, test_db_session, test_user):
        stats = UserStats(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            weight_lbs=180.0,
            body_fat_percent=18.5,
            workout_minutes=150,
            notes="Test stats",
        )
        test_db_session.add(stats)
        test_db_session.commit()
        test_db_session.refresh(stats)

        assert stats.user_id == test_user.id
        assert stats.weight_lbs == 180.0
        assert stats.body_fat_percent == 18.5

    def test_update_user_stats(self, test_db_session, test_user_stats):
        test_user_stats.weight_lbs       = 175.0
        test_user_stats.body_fat_percent = 17.5
        test_user_stats.workout_minutes  = 200
        test_db_session.commit()
        test_db_session.refresh(test_user_stats)

        assert test_user_stats.weight_lbs == 175.0
        assert test_user_stats.workout_minutes == 200

    def test_stats_numeric_calculations(self, test_db_session, test_user):
        stats = UserStats(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            weight_lbs=200.0,
            body_fat_percent=25.0,
            workout_minutes=500,
        )
        test_db_session.add(stats)
        test_db_session.commit()
        test_db_session.refresh(stats)

        avg_minutes_per_week = stats.workout_minutes / 4
        assert avg_minutes_per_week == pytest.approx(125.0, rel=0.01)


class TestConversationModel:
    """Test Conversation model"""

    def test_create_conversation(self, test_db_session, test_user):
        conversation = Conversation(
            id="conv-001",
            user_id=test_user.id,
            title="Workout Planning",
        )
        test_db_session.add(conversation)
        test_db_session.commit()
        test_db_session.refresh(conversation)

        assert conversation.id == "conv-001"
        assert conversation.user_id == test_user.id
        assert conversation.title == "Workout Planning"

    def test_conversation_timestamps(self, test_db_session, test_user):
        conversation = Conversation(
            id="conv-002",
            user_id=test_user.id,
        )
        test_db_session.add(conversation)
        test_db_session.commit()
        test_db_session.refresh(conversation)

        assert conversation.created_at is not None


class TestFeedbackModel:
    """Test Feedback model"""

    def test_create_feedback(self, test_db_session, test_user):
        """Test creating feedback using actual model columns."""
        feedback = Feedback(
            id="feedback-001",
            user_id=test_user.id,
            message_id="msg-001",
            rating=5,                 # ✅ real column
            comment="Great app!",
            helpful=True,             # ✅ real column (not feedback_type)
        )
        test_db_session.add(feedback)
        test_db_session.commit()
        test_db_session.refresh(feedback)

        assert feedback.user_id == test_user.id
        assert feedback.rating == 5
        assert feedback.comment == "Great app!"
        assert feedback.helpful is True


class TestUserRelationships:
    """Test relationships between models"""

    def test_user_has_many_conversations(self, test_db_session, test_user):
        conv1 = Conversation(id="conv-user-001", user_id=test_user.id)
        conv2 = Conversation(id="conv-user-002", user_id=test_user.id)
        test_db_session.add(conv1)
        test_db_session.add(conv2)
        test_db_session.commit()

        assert len(test_user.conversations) == 2

    def test_user_has_stats(self, test_db_session, test_user, test_user_stats):
        test_db_session.refresh(test_user)

        assert len(test_user.stats) > 0
        assert test_user.stats[0].user_id == test_user.id


class TestModelValidation:
    """Test model validation and constraints"""

    def test_unique_email_constraint(self, test_db_session, test_user):
        duplicate_user = User(
            id="user-dup",
            name="Duplicate",
            email=test_user.email,
        )
        test_db_session.add(duplicate_user)
        with pytest.raises(Exception):
            test_db_session.commit()

    def test_primary_key_constraint(self, test_db_session, test_user):
        duplicate_id = User(
            id=test_user.id,
            name="Another",
            email="another@example.com",
        )
        test_db_session.add(duplicate_id)
        with pytest.raises(Exception):
            test_db_session.commit()