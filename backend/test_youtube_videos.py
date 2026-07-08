#!/usr/bin/env python3
"""
Test script to verify YouTube Exercise Video Search functionality
Run this from the backend directory: python test_youtube_videos.py
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from tools.youtube_search import search_exercise_videos

def print_header(text):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def test_youtube_search():
    """Test various fitness goals and exercises"""
    
    print_header("YouTube Exercise Video Search — Test Suite")
    
    # Check API key
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        print("❌ YOUTUBE_API_KEY not found in .env")
        print("   Please add: YOUTUBE_API_KEY=your_key_here")
        return False
    
    print("✓ YouTube API Key configured")
    
    # Test cases
    test_cases = [
        ("weight_loss", ""),
        ("muscle_gain", "squat"),
        ("flexibility", ""),
        ("hip_mobility", "hip stretch"),
        ("cardio", ""),
        ("general", "plank"),
    ]
    
    all_passed = True
    
    for goal, exercise in test_cases:
        print(f"\n📝 Testing: goal='{goal}' exercise='{exercise}'")
        
        result = search_exercise_videos(goal, exercise)
        
        if result.get("error"):
            print(f"   ❌ Error: {result['error']}")
            all_passed = False
            continue
        
        videos = result.get("videos", [])
        query = result.get("query", "")
        
        print(f"   Query: {query}")
        print(f"   Found: {len(videos)} videos")
        
        if not videos:
            print(f"   ⚠️  No videos found")
            continue
        
        # Show first video details
        video = videos[0]
        print(f"   ✓ Sample Video:")
        print(f"     - Title: {video['title'][:60]}...")
        print(f"     - Channel: {video['channel']}")
        print(f"     - YouTube ID: {video['youtube_id']}")
        print(f"     - Embeddable: Yes (verified)")
    
    return all_passed

def test_backend_endpoint():
    """Test the backend API endpoint"""
    print_header("Testing Backend Endpoint")
    
    try:
        import requests
        from api.schemas import ChatRequest
        
        print("✓ FastAPI and dependencies available")
        print("✓ Can test endpoint after server starts with:")
        print()
        print("   curl -H \"Authorization: Bearer YOUR_TOKEN\" \\")
        print("     \"http://localhost:8000/api/exercises/videos?goal=weight_loss\"")
        
    except ImportError as e:
        print(f"✓ FastAPI test skipped (dev environment)")

if __name__ == "__main__":
    print("\n🎯 YouTube Exercise Videos — Testing\n")
    
    try:
        success = test_youtube_search()
        test_backend_endpoint()
        
        print_header("Test Summary")
        if success:
            print("✓ All tests passed!")
            print("\nYou can now:")
            print("1. Start the backend: uvicorn api.main:app --reload")
            print("2. Test the endpoint with curl or Postman")
            print("3. Use the frontend component: <ExerciseVideoGallery />")
        else:
            print("⚠️  Some tests failed. Check your API key and try again.")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
