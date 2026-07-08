# YouTube Exercise Videos Feature — Integration Guide

## Overview
This feature allows users to search for exercise demo videos from YouTube tailored to their fitness goals. The implementation includes:
1. ✅ Backend tool: `backend/tools/youtube_search.py`
2. ✅ Agent integration: Updated `backend/agent/fitness_agent.py`
3. ✅ API endpoint: `/api/exercises/videos` in `backend/api/main.py`
4. 📋 Frontend integration: Sample code below

---

## Backend Setup

### 1. Environment Variables
Add to your `.env` file:
```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

To get a YouTube API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **YouTube Data API v3**
4. Create an API key (Credentials → API key)
5. Copy the key to your `.env`

### 2. Backend Files Created/Updated

#### `backend/tools/youtube_search.py` ✅
- `search_exercise_videos(fitness_goal: str, exercise_name: str = "") → dict`
- Supports goals: `weight_loss`, `muscle_gain`, `flexibility`, `hip_mobility`, `cardio`, `endurance`, `general`, `core_strength`, `balance`, `posture`
- Returns up to 6 short videos matching the goal

#### `backend/agent/fitness_agent.py` ✅
- Added tool definition in `TOOLS` list
- `execute_tool(tool_name, params)` method to call YouTube search
- Agent can now recommend exercise videos in responses

#### `backend/api/main.py` ✅
- Endpoint: `GET /api/exercises/videos?goal=weight_loss&exercise=squat`
- Requires authentication (JWT token)
- Returns: `{ "videos": [...], "query": "..." }`

---

## Frontend Integration

### Step 1: Create API Helper Function

Add this to your frontend API utilities (e.g., `frontend/lib/api.ts` or similar):

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ExerciseVideo {
  youtube_id: string;
  title: string;
  thumbnail: string;
  channel: string;
  description: string;
}

export interface ExerciseVideosResponse {
  videos: ExerciseVideo[];
  query?: string;
  error?: string;
}

export async function getExerciseVideos(
  goal: string = "general",
  exercise: string = ""
): Promise<ExerciseVideosResponse> {
  const token = localStorage.getItem("authToken");
  if (!token) {
    return { videos: [], error: "Not authenticated" };
  }

  try {
    const params = new URLSearchParams();
    if (goal) params.append("goal", goal);
    if (exercise) params.append("exercise", exercise);

    const res = await fetch(`${API_URL}/api/exercises/videos?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return { videos: [], error: `API error: ${res.status}` };
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch exercise videos:", error);
    return { videos: [], error: String(error) };
  }
}
```

### Step 2: Create a Video Gallery Component

Create `frontend/components/ExerciseVideoGallery.tsx`:

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { ExerciseVideo, ExerciseVideosResponse, getExerciseVideos } from "@/lib/api";

export interface ExerciseVideoGalleryProps {
  fitnessGoal?: string;
  exerciseName?: string;
}

export default function ExerciseVideoGallery({
  fitnessGoal = "general",
  exerciseName = "",
}: ExerciseVideoGalleryProps) {
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      const result = await getExerciseVideos(fitnessGoal, exerciseName);
      if (result.error) {
        setError(result.error);
      } else {
        setVideos(result.videos);
      }
      setLoading(false);
    };

    fetchVideos();
  }, [fitnessGoal, exerciseName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading exercise videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load videos: {error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No videos found for this exercise.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <a
          key={video.youtube_id}
          href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="relative aspect-video bg-gray-900 overflow-hidden">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="p-3 bg-white">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600">
              {video.title}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.channel}</p>
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
              {video.description}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
```

### Step 3: Use the Component in Your Workouts Page

In your workouts page (e.g., `frontend/app/workouts/page.tsx`):

```typescript
"use client";

import ExerciseVideoGallery from "@/components/ExerciseVideoGallery";
import { useUserProfile } from "@/context/UserProfileContext"; // or your profile context

export default function WorkoutsPage() {
  const { profile } = useUserProfile();
  const primaryGoal = profile?.primary_goal || "general";

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Workouts</h1>

      {/* Your existing workout content */}

      {/* Exercise Video Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Exercise Demonstrations</h2>
        <p className="text-gray-600 mb-4">
          Watch these exercise demos tailored to your {primaryGoal} goal.
        </p>
        <ExerciseVideoGallery fitnessGoal={primaryGoal} />
      </div>
    </div>
  );
}
```

### Step 4: Add to Exercises/Library Page (Optional)

If you have a dedicated exercises library page:

```typescript
"use client";

import { useState } from "react";
import ExerciseVideoGallery from "@/components/ExerciseVideoGallery";

const FITNESS_GOALS = [
  { id: "weight_loss", label: "Weight Loss" },
  { id: "muscle_gain", label: "Muscle Gain" },
  { id: "flexibility", label: "Flexibility" },
  { id: "hip_mobility", label: "Hip Mobility" },
  { id: "cardio", label: "Cardio" },
  { id: "endurance", label: "Endurance" },
  { id: "core_strength", label: "Core Strength" },
  { id: "balance", label: "Balance" },
];

export default function ExerciseLibraryPage() {
  const [selectedGoal, setSelectedGoal] = useState("general");
  const [exerciseName, setExerciseName] = useState("");

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Exercise Library</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Fitness Goal</label>
          <select
            value={selectedGoal}
            onChange={(e) => setSelectedGoal(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-48"
          >
            <option value="general">General Fitness</option>
            {FITNESS_GOALS.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Exercise (Optional)</label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="e.g., squat, plank, deadlift"
            className="border rounded px-3 py-2 w-full md:w-48"
          />
        </div>
      </div>

      {/* Video Gallery */}
      <ExerciseVideoGallery
        fitnessGoal={selectedGoal}
        exerciseName={exerciseName}
      />
    </div>
  );
}
```

---

## Testing

### Backend Test
```bash
# Test the endpoint directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/exercises/videos?goal=weight_loss&exercise=squat"
```

### Frontend Test
1. Navigate to your workouts page
2. You should see exercise videos loaded and displayed
3. Click on a video to open it on YouTube

---

## Fitness Goals Supported

| Goal ID | Description |
|---------|-------------|
| `weight_loss` | Fat burning and cardio |
| `muscle_gain` | Strength training form |
| `flexibility` | Stretching techniques |
| `hip_mobility` | Hip mobility exercises |
| `cardio` | Cardio workouts |
| `endurance` | Endurance training |
| `core_strength` | Core strengthening |
| `balance` | Balance training |
| `posture` | Posture correction |
| `general` | Full body workouts |

---

## Troubleshooting

### "YouTube API key not configured"
- Add `YOUTUBE_API_KEY` to `backend/.env`
- Restart the backend server

### Videos not appearing
- Check browser console for errors
- Verify JWT token is valid: `localStorage.getItem("authToken")`
- Test with backend curl command above

### "API error: 401"
- User is not authenticated
- Token may have expired
- Re-login to get fresh token

---

## Security Notes
- API requires authentication (JWT token)
- YouTube API key should be kept in `.env` (backend only)
- All API calls are rate-limited by YouTube (100 requests/day on free tier)
- Videos are filtered for safe content (`safeSearch: strict`)

---

## Next Steps
- Monitor YouTube API usage in your Google Cloud dashboard
- Consider caching popular searches to reduce API calls
- Add favorites/bookmarking for frequently-watched videos
- Track which exercises users watch most
