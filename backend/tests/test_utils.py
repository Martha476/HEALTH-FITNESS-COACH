"""Test Utilities - Helper functions for testing"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json


# ─────────────────────────────────────────────────────────────
#  Test Data Generators
# ─────────────────────────────────────────────────────────────

def generate_user_data(
    name: str = "Test User",
    email: Optional[str] = None,
    age: int = 30,
    weight_lbs: float = 180.0,
    height_inches: float = 72.0,
) -> Dict[str, Any]:
    """Generate user data for testing"""
    return {
        "name": name,
        "email": email or f"{name.lower().replace(' ', '.')}@example.com",
        "age": age,
        "weight_lbs": weight_lbs,
        "height_inches": height_inches,
        "fitness_level": "intermediate",
        "goals": ["lose_weight", "build_muscle"],
    }


def generate_meal_data(
    name: str = "Test Meal",
    calories: int = 500,
    protein_g: int = 30,
    carbs_g: int = 50,
    fat_g: int = 15,
    meal_type: str = "lunch",
) -> Dict[str, Any]:
    """Generate meal data for testing"""
    return {
        "name": name,
        "calories": calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g,
        "meal_type": meal_type,
        "date": datetime.utcnow().isoformat(),
    }


def generate_workout_data(
    name: str = "Test Workout",
    workout_type: str = "cardio",
    duration_minutes: int = 30,
    intensity: str = "moderate",
    calories_burned: int = 300,
) -> Dict[str, Any]:
    """Generate workout data for testing"""
    return {
        "name": name,
        "type": workout_type,
        "duration_minutes": duration_minutes,
        "intensity": intensity,
        "calories_burned": calories_burned,
        "date": datetime.utcnow().isoformat(),
    }


def generate_water_intake_data(amount_ml: int = 250) -> Dict[str, Any]:
    """Generate water intake data for testing"""
    return {
        "amount_ml": amount_ml,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────
#  Test Assertions & Validators
# ─────────────────────────────────────────────────────────────

def assert_valid_user_response(data: Dict[str, Any]) -> bool:
    """Validate user response structure"""
    required_fields = ["id", "name", "email"]
    return all(field in data for field in required_fields)


def assert_valid_meal_response(data: Dict[str, Any]) -> bool:
    """Validate meal response structure"""
    required_fields = ["id", "name", "calories"]
    return all(field in data for field in required_fields)


def assert_valid_workout_response(data: Dict[str, Any]) -> bool:
    """Validate workout response structure"""
    required_fields = ["id", "name", "duration_minutes"]
    return all(field in data for field in required_fields)


def assert_valid_auth_response(data: Dict[str, Any]) -> bool:
    """Validate authentication response"""
    return "access_token" in data or "token" in data or "user" in data


# ─────────────────────────────────────────────────────────────
#  Test Data Cleanup
# ─────────────────────────────────────────────────────────────

def cleanup_test_data(db_session, models_to_clear: list) -> None:
    """Clean up test data from database"""
    try:
        for model in models_to_clear:
            db_session.query(model).delete()
        db_session.commit()
    except Exception as e:
        print(f"Error cleaning up test data: {e}")
        db_session.rollback()


# ─────────────────────────────────────────────────────────────
#  Mock Data Helpers
# ─────────────────────────────────────────────────────────────

class MockAPIResponse:
    """Mock API response for testing"""
    
    def __init__(self, status_code: int = 200, data: Optional[Dict] = None):
        self.status_code = status_code
        self.data = data or {}
    
    def json(self) -> Dict:
        return self.data
    
    def __getitem__(self, key):
        return self.data.get(key)


def create_mock_token(user_id: str, expires_in_hours: int = 24) -> str:
    """Create a mock JWT token for testing"""
    import jwt
    from datetime import datetime, timedelta
    
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=expires_in_hours),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, "test-secret", algorithm="HS256")


# ─────────────────────────────────────────────────────────────
#  Performance Test Helpers
# ─────────────────────────────────────────────────────────────

class PerformanceTimer:
    """Timer for performance testing"""
    
    def __init__(self, operation_name: str = "Operation"):
        self.operation_name = operation_name
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, *args):
        self.end_time = datetime.utcnow()
    
    @property
    def duration_ms(self) -> float:
        """Get duration in milliseconds"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds() * 1000
        return 0
    
    def assert_performance(self, max_duration_ms: float) -> bool:
        """Assert operation completed within time limit"""
        if self.duration_ms > max_duration_ms:
            raise AssertionError(
                f"{self.operation_name} took {self.duration_ms}ms, "
                f"expected <= {max_duration_ms}ms"
            )
        return True


# ─────────────────────────────────────────────────────────────
#  Database Test Helpers
# ─────────────────────────────────────────────────────────────

def get_test_database_url() -> str:
    """Get test database URL"""
    return os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")


def assert_database_integrity(db_session) -> bool:
    """Check database integrity"""
    try:
        # Try a simple query
        db_session.execute("SELECT 1")
        return True
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────
#  API Test Helpers
# ─────────────────────────────────────────────────────────────

def get_auth_headers(token: str = "test-token") -> Dict[str, str]:
    """Get authorization headers for API requests"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def assert_response_status(response, expected_status_codes: list) -> bool:
    """Assert response status is one of expected codes"""
    if response.status_code not in expected_status_codes:
        raise AssertionError(
            f"Expected status in {expected_status_codes}, "
            f"got {response.status_code}. Response: {response.text}"
        )
    return True


# ─────────────────────────────────────────────────────────────
#  Data Comparison Helpers
# ─────────────────────────────────────────────────────────────

def compare_objects(obj1: Dict, obj2: Dict, ignore_fields: list = None) -> bool:
    """Compare two objects, ignoring specified fields"""
    ignore_fields = ignore_fields or ["id", "created_at", "updated_at"]
    
    for key, value in obj1.items():
        if key not in ignore_fields:
            if obj2.get(key) != value:
                return False
    return True


def extract_field(response: Dict, field_path: str) -> Any:
    """Extract nested field from response using dot notation"""
    parts = field_path.split(".")
    value = response
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part)
        else:
            return None
    return value
