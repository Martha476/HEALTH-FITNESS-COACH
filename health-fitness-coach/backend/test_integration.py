"""Test script to verify backend integration"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("Testing imports...")
    from database import init_db, get_db, SessionLocal
    from database.models import Base, User, UserSettings, TokenUsage
    print("✓ Database imports successful")
    
    from api.main import app
    print("✓ API main imports successful")
    
    print("\nTesting database initialization...")
    init_db()
    print("✓ Database initialized")
    
    print("\nTesting models...")
    print(f"  - User table: {User.__tablename__}")
    print(f"  - UserSettings table: {UserSettings.__tablename__}")
    print(f"  - TokenUsage table: {TokenUsage.__tablename__}")
    print("✓ All models loaded")
    
    print("\n✓ All tests passed! Backend is ready.")
    
except Exception as e:
    print(f"\n✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
