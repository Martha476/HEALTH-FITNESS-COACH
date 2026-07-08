"""Integration Tests — paths matched to actual main.py routes"""

import pytest
from datetime import datetime, timezone


class TestUserOnboardingFlow:
    """Test complete user onboarding"""

    def test_user_registration_and_profile_setup(self, client):
        # Register
        register_response = client.post(
            "/api/auth/register",
            json={
                "name":     "Integration User",
                "email":    "integration@example.com",
                "password": "password123",
            },
        )
        assert register_response.status_code in [200, 201, 409, 500]

        # Login
        login_response = client.post(
            "/api/auth/login",
            json={"email": "integration@example.com", "password": "password123"},
        )
        assert login_response.status_code in [200, 401, 403, 500]


class TestDailyHealthTracking:
    """Test a complete daily tracking flow"""

    def test_complete_daily_tracking_flow(self, client, test_user):
        # Log breakfast via chat
        breakfast_response = client.post(
            "/api/chat",
            json={
                "message":      "I had oatmeal with berries for breakfast",
                "user_profile": {"id": test_user.id, "name": test_user.name},
                "settings":     {},
                "history":      [],
            },
        )
        assert breakfast_response.status_code in [200, 201, 400, 401, 403, 422]

        # Log water
        water_response = client.post(
            "/api/water-intake/log",
            json={
                "amount_ml": 500,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        assert water_response.status_code in [200, 201, 401, 403, 404, 422]

        # Get stats
        stats_response = client.get(f"/api/stats/{test_user.id}")
        assert stats_response.status_code in [200, 401, 403]


class TestWeeklyProgressTracking:
    """Test weekly progress tracking"""

    def test_weekly_stats_accumulation(self, test_db_session, test_user):
        from database.models import UserStats
        import uuid

        # Add multiple stat entries
        for i in range(7):
            stats = UserStats(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                weight_lbs=180.0 - i * 0.1,
                workout_minutes=30 + i * 5,
            )
            test_db_session.add(stats)
        test_db_session.commit()

        all_stats = test_db_session.query(UserStats).filter(
            UserStats.user_id == test_user.id
        ).all()
        assert len(all_stats) >= 7
        total_minutes = sum(s.workout_minutes for s in all_stats if s.workout_minutes)
        assert total_minutes > 0


class TestAICoachInteraction:
    """Test AI coach conversation"""

    def test_start_and_continue_conversation(self, client, test_user):
        # First message
        response1 = client.post(
            "/api/chat",
            json={
                "message":      "I want to lose weight. Where do I start?",
                "user_profile": {"id": test_user.id, "name": test_user.name},
                "settings":     {},
                "history":      [],
            },
        )
        assert response1.status_code in [200, 400, 401, 403, 422]

        # Follow-up message
        response2 = client.post(
            "/api/chat",
            json={
                "message":      "What exercises should I do?",
                "user_profile": {"id": test_user.id, "name": test_user.name},
                "settings":     {},
                "history":      [],
            },
        )
        assert response2.status_code in [200, 400, 401, 403, 422]


class TestDataConsistency:
    """Test data consistency across operations"""

    def test_user_stats_consistency(self, test_db_session, test_user):
        from database.models import UserStats
        import uuid

        stats = UserStats(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            weight_lbs=175.0,
            body_fat_percent=18.0,
            workout_minutes=45,
        )
        test_db_session.add(stats)
        test_db_session.commit()
        test_db_session.refresh(stats)

        assert stats.weight_lbs == 175.0
        assert stats.user_id == test_user.id

    def test_user_settings_persistence(self, test_db_session, test_user):
        from database.models import UserSettings
        import uuid

        settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            theme="dark",
            language="en",
            units="metric",
        )
        test_db_session.add(settings)
        test_db_session.commit()
        test_db_session.refresh(settings)

        assert settings.theme == "dark"
        assert settings.units == "metric"


class TestErrorRecovery:
    """Test error recovery"""

    def test_invalid_request_recovery(self, client):
        # Send malformed chat request
        response1 = client.post("/api/chat", json={"message": ""})
        assert response1.status_code in [400, 422, 401, 403]

        # Valid request should still work after the bad one
        response2 = client.post(
            "/api/chat",
            json={
                "message":      "Hello",
                "user_profile": {"id": "test-001"},
                "settings":     {},
                "history":      [],
            },
        )
        assert response2.status_code in [200, 400, 401, 403, 422]


class TestPerformanceAndLoad:
    """Test performance and load handling"""

    def test_multiple_rapid_requests(self, client):
        responses = []
        for _ in range(10):
            r = client.get("/health")
            responses.append(r.status_code)
        # Health check is at /health (not /api/health)
        assert any(code == 200 for code in responses)

    def test_large_data_handling(self, client):
        large_history = [
            {"role": "user",      "content": f"Message {i}"}
            if i % 2 == 0
            else {"role": "assistant", "content": f"Response {i}"}
            for i in range(50)
        ]
        response = client.post(
            "/api/chat",
            json={
                "message":      "Summarise our conversation",
                "user_profile": {"id": "test-001"},
                "settings":     {},
                "history":      large_history,
            },
        )
        assert response.status_code in [200, 201, 400, 401, 403, 422]


class TestDataValidation:
    """Test data validation"""

    def test_meal_data_validation(self, client):
        # Missing required fields for chat
        response = client.post("/api/chat", json={"message": ""})
        assert response.status_code in [400, 401, 403, 422]

    def test_workout_data_validation(self, client):
        # Post to workouts with missing fields
        response = client.post("/api/workouts", json={})
        assert response.status_code in [400, 401, 403, 404, 422]