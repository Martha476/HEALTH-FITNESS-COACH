"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import TopNavBar from "../components/TopNavBar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Sync helpers ──────────────────────────────────────────────────────────────
const KEYS = {
  workoutHistory: "workoutHistory",
  dashboardStats: "dashboardStats",
} as const;

function scopedKey(userId: string, key: string) {
  return `user_${userId}_${key}`;
}

function readList<T>(userId: string, key: string): T[] {
  try {
    const scoped = localStorage.getItem(scopedKey(userId, key));
    if (scoped) return JSON.parse(scoped) as T[];
    const global = localStorage.getItem(key);
    if (global)  return JSON.parse(global)  as T[];
  } catch {}
  return [];
}

function writeData<T>(userId: string, key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(scopedKey(userId, key), json);
    localStorage.setItem(key, json);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: json }));
  } catch {}
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkoutPlan {
  day: string;
  exercises: Array<{
    name:    string;
    sets:    number;
    reps:    number;
    weight?: string;
  }>;
}

interface SavedWorkout {
  id:        string;
  name:      string;
  date:      string;
  duration:  number;
  exercises: number;
}

interface YouTubeVideo {
  youtube_id:  string;
  title:       string;
  thumbnail:   string;
  channel:     string;
  description: string;
}

// ─── Fallback videos (when API fails) ─────────────────────────────────────────
const FALLBACK_VIDEOS: Record<string, YouTubeVideo[]> = {
  "hip_mobility": [
    { youtube_id: "i1Dl_WBxI8o", title: "Hip Mobility Exercises", thumbnail: "https://img.youtube.com/vi/i1Dl_WBxI8o/mqdefault.jpg", channel: "Fitness Demo", description: "Hip mobility exercises for better movement" },
    { youtube_id: "0SMEsZ7tJkQ", title: "Hip Stretching Routine", thumbnail: "https://img.youtube.com/vi/0SMEsZ7tJkQ/mqdefault.jpg", channel: "Fitness Demo", description: "Daily hip stretching routine" },
  ],
  "flexibility": [
    { youtube_id: "M2Q8gKTNxKI", title: "Full Body Stretching Routine", thumbnail: "https://img.youtube.com/vi/M2Q8gKTNxKI/mqdefault.jpg", channel: "Fitness Demo", description: "Complete flexibility workout" },
    { youtube_id: "fUBnT3Tmc50", title: "Dynamic Stretching", thumbnail: "https://img.youtube.com/vi/fUBnT3Tmc50/mqdefault.jpg", channel: "Fitness Demo", description: "Dynamic stretching exercises" },
  ],
  "muscle_gain": [
    { youtube_id: "R0X-wfYkRYY", title: "Full Body Strength Training", thumbnail: "https://img.youtube.com/vi/R0X-wfYkRYY/mqdefault.jpg", channel: "Fitness Demo", description: "Strength training for muscle gain" },
    { youtube_id: "UyR0bPNBw2w", title: "Upper Body Workout", thumbnail: "https://img.youtube.com/vi/UyR0bPNBw2w/mqdefault.jpg", channel: "Fitness Demo", description: "Upper body muscle building" },
  ],
  "general": [
    { youtube_id: "IODxDxX7oi4", title: "Push-ups - Perfect Form", thumbnail: "https://img.youtube.com/vi/IODxDxX7oi4/mqdefault.jpg", channel: "Fitness Demo", description: "Proper push-up technique" },
    { youtube_id: "ultWZbUMPL8", title: "Squat - Perfect Form", thumbnail: "https://img.youtube.com/vi/ultWZbUMPL8/mqdefault.jpg", channel: "Fitness Demo", description: "Proper squat technique" },
  ],
};

// ─── Goal mapping ──────────────────────────────────────────────────────────────
const GOAL_MAPPING: Record<string, string> = {
  "muscle-building": "muscle_gain",
  "muscle gain": "muscle_gain",
  "build-muscle": "muscle_gain",
  "muscle-gain": "muscle_gain",
  "weight loss": "fat_loss",
  "fat loss": "fat_loss",
  "lose-weight": "fat_loss",
  "weight-loss": "fat_loss",
  "strength": "strength",
  "strength-training": "strength",
  "endurance": "endurance",
  "improve-endurance": "endurance",
  "cardio": "endurance",
  "cardiovascular health": "endurance",
  "flexibility": "flexibility",
  "improve-flexibility": "flexibility",
  "mobility": "flexibility",
  "hip-mobility": "hip_mobility",
  "hip_mobility": "hip_mobility",
  "stress relief": "flexibility",
  "better sleep": "flexibility",
  "stay active": "endurance",
  "lower body strength & shape": "strength",
  "lower-body-strength": "strength",
  "glute strength": "strength",
  "core strength": "strength",
  "core-strength": "strength",
};

// ─── Components ──────────────────────────────────────────────────────────────
function ExerciseCard({
  exercise,
  onShowVideo,
  isLoading,
}: {
  exercise: WorkoutPlan["exercises"][0];
  onShowVideo: (exerciseName: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-slate-700 rounded-xl p-4 border-l-4 border-green-500 hover:bg-slate-600/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-100">{exercise.name}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShowVideo(exercise.name)}
            disabled={isLoading}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
            title="Find exercise demo on YouTube"
          >
            {isLoading ? "⏳" : "🎥 Demo"}
          </button>
          <input type="checkbox" className="w-4 h-4 accent-green-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Sets",   val: exercise.sets           },
          { label: "Reps",   val: exercise.reps           },
          { label: "Weight", val: exercise.weight || "BW" },
        ].map((item) => (
          <div key={item.label} className="text-center bg-slate-600/50 rounded-lg py-2">
            <p className="text-slate-400 text-xs uppercase tracking-wide">{item.label}</p>
            <p className="text-base font-bold text-slate-100 mt-0.5">{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Video Modal ──────────────────────────────────────────────────────────────
function ExerciseVideoModal({ video, onClose }: { video: YouTubeVideo | null; onClose: () => void }) {
  if (!video) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 truncate pr-4">🎥 {video.title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${video.youtube_id}`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          <div>
            <p className="text-xs text-slate-400">Channel</p>
            <p className="text-sm text-slate-200 font-medium">{video.channel}</p>
          </div>

          {video.description && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-300">{video.description}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Workouts Page
// ═════════════════════════════════════════════════════════════════════════════
export default function Workouts() {
  const { user } = useAuth();

  // Profile values
  const [profileGoalRaw, setProfileGoalRaw] = useState<string | null>(null);
  const [profileExperienceRaw, setProfileExperienceRaw] = useState<string | null>(null);
  const [profileDurationRaw, setProfileDurationRaw] = useState<string | null>(null);

  // Form values
  const [fitnessGoal, setFitnessGoal] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);

  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generate");
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState<SavedWorkout[]>([]);

  // ─── Video state ──────────────────────────────────────────────────────────────
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [videoSearchTerm, setVideoSearchTerm] = useState("");
  const [videoDemoLoading, setVideoDemoLoading] = useState(false);

  // ─── Load profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setWorkoutHistory(readList<SavedWorkout>(user.id, KEYS.workoutHistory));

    const loadAndSyncProfile = () => {
      try {
        let savedProfile = localStorage.getItem(`user_${user.id}_userProfile`);
        if (!savedProfile) {
          savedProfile = localStorage.getItem("userProfile");
        }

        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          if (profile.primaryGoal) {
            setProfileGoalRaw(profile.primaryGoal);
            setFitnessGoal(profile.primaryGoal);
          }
          if (profile.experienceLevel) {
            setProfileExperienceRaw(profile.experienceLevel);
            setExperience(profile.experienceLevel);
          }
          if (profile.workoutDuration) {
            const durationMins = profile.workoutDuration.replace(/[^\d]/g, "");
            if (durationMins) {
              setProfileDurationRaw(durationMins);
              setDuration(durationMins);
            }
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    loadAndSyncProfile();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `user_${user.id}_userProfile` || e.key === "userProfile") {
        loadAndSyncProfile();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.id]);

  // ─── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // ─── Fetch Videos ────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(
    async (exerciseOverride?: string) => {
      if (!profileGoalRaw) {
        setVideos([]);
        setVideosError("Set a fitness goal in your profile to see tailored exercise demos.");
        return;
      }

      setVideosLoading(true);
      setVideosError(null);

      try {
        const params = new URLSearchParams({
          goal: profileGoalRaw,
          exercise: exerciseOverride ?? videoSearchTerm ?? "",
        });
        const url = `${API_URL}/api/exercises/videos?${params.toString()}`;

        const res = await fetch(url, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Server responded ${res.status}`);
        }

        const data = await res.json();

        if (data.error) {
          // Use fallback videos
          const goalKey = GOAL_MAPPING[profileGoalRaw?.toLowerCase() ?? ""] || "general";
          const fallback = FALLBACK_VIDEOS[goalKey] || FALLBACK_VIDEOS["general"];
          setVideos(fallback);
          setVideosError(null);
          return;
        }

        if (data.videos && data.videos.length > 0) {
          setVideos(data.videos);
          setVideosError(null);
        } else {
          // Use fallback videos
          const goalKey = GOAL_MAPPING[profileGoalRaw?.toLowerCase() ?? ""] || "general";
          const fallback = FALLBACK_VIDEOS[goalKey] || FALLBACK_VIDEOS["general"];
          setVideos(fallback);
          setVideosError(null);
        }
      } catch (err) {
        console.error("Failed to fetch exercise videos:", err);
        // Use fallback videos on error
        const goalKey = GOAL_MAPPING[profileGoalRaw?.toLowerCase() ?? ""] || "general";
        const fallback = FALLBACK_VIDEOS[goalKey] || FALLBACK_VIDEOS["general"];
        setVideos(fallback);
        setVideosError(null);
      } finally {
        setVideosLoading(false);
      }
    },
    [profileGoalRaw, videoSearchTerm]
  );

  // ─── Auto-load videos ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "library" && profileGoalRaw && videos.length === 0 && !videosLoading) {
      fetchVideos();
    }
  }, [activeTab, profileGoalRaw]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const saveWorkout = (secs: number) => {
    if (!workoutPlan || !user) return;
    const w: SavedWorkout = {
      id: Date.now().toString(),
      name: workoutPlan.day,
      date: new Date().toISOString(),
      duration: Math.floor(secs / 60),
      exercises: workoutPlan.exercises.length,
    };
    const updated = [w, ...workoutHistory];
    setWorkoutHistory(updated);
    writeData(user.id, KEYS.workoutHistory, updated);

    const today = new Date().toDateString();
    const todayWorks = updated.filter((x) => new Date(x.date).toDateString() === today);
    writeData(user.id, KEYS.dashboardStats, {
      workoutCount: todayWorks.length,
      totalMinutes: todayWorks.reduce((s, x) => s + x.duration, 0),
      caloriesBurned: todayWorks.length * 350,
    });
  };

  const toggleTimer = () => {
    if (timerActive) {
      const ok = window.confirm(`Workout done in ${formatTime(elapsedTime)}. Save to history?`);
      if (ok) { saveWorkout(elapsedTime); alert("Workout saved! Check your Progress page."); }
      setElapsedTime(0);
      setTimerActive(false);
    } else {
      setElapsedTime(0);
      setTimerActive(true);
    }
  };

  // ─── Generate Workout ────────────────────────────────────────────────────────
  const generateWorkout = async () => {
    setLoading(true);
    try {
      const mappedGoal = GOAL_MAPPING[fitnessGoal?.toLowerCase() ?? ""] || "muscle_gain";
      const mappedExperience = experience?.toLowerCase() || "intermediate";

      const templates: Record<string, WorkoutPlan> = {
        muscle_gain: {
          day: "Upper Body Hypertrophy",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, reps: 8, weight: "185 lbs" },
            { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: "60 lbs" },
            { name: "Cable Flyes", sets: 3, reps: 12, weight: "40 lbs" },
            { name: "Bent Over Rows", sets: 4, reps: 8, weight: "165 lbs" },
            { name: "Pull-ups", sets: 3, reps: 10, weight: "BW" },
            { name: "Overhead Press", sets: 3, reps: 10, weight: "95 lbs" },
          ],
        },
        fat_loss: {
          day: "Full Body Circuit",
          exercises: [
            { name: "Burpees", sets: 3, reps: 15, weight: "BW" },
            { name: "Mountain Climbers", sets: 3, reps: 20, weight: "BW" },
            { name: "Jump Squats", sets: 4, reps: 12, weight: "BW" },
            { name: "Push-ups", sets: 3, reps: 15, weight: "BW" },
            { name: "High Knees", sets: 3, reps: 30, weight: "BW" },
            { name: "Plank", sets: 3, reps: 60, weight: "sec" },
          ],
        },
        strength: {
          day: "Powerlifting Focus",
          exercises: [
            { name: "Barbell Squat", sets: 5, reps: 5, weight: "225 lbs" },
            { name: "Deadlift", sets: 4, reps: 5, weight: "275 lbs" },
            { name: "Bench Press", sets: 5, reps: 5, weight: "185 lbs" },
            { name: "Overhead Press", sets: 3, reps: 5, weight: "115 lbs" },
            { name: "Barbell Rows", sets: 4, reps: 6, weight: "155 lbs" },
          ],
        },
        endurance: {
          day: "Cardio & Endurance",
          exercises: [
            { name: "Running", sets: 1, reps: 30, weight: "min" },
            { name: "Cycling", sets: 1, reps: 20, weight: "min" },
            { name: "Box Jumps", sets: 4, reps: 15, weight: "BW" },
            { name: "Battle Ropes", sets: 4, reps: 30, weight: "sec" },
            { name: "Rowing Machine", sets: 3, reps: 500, weight: "m" },
          ],
        },
        flexibility: {
          day: "Flexibility & Mobility",
          exercises: [
            { name: "Dynamic Stretching", sets: 2, reps: 10, weight: "min" },
            { name: "Yoga Flow", sets: 1, reps: 20, weight: "min" },
            { name: "Foam Rolling", sets: 1, reps: 10, weight: "min" },
            { name: "Hip Flexor Stretch", sets: 3, reps: 30, weight: "sec" },
            { name: "Hamstring Stretch", sets: 3, reps: 30, weight: "sec" },
          ],
        },
      };

      let plan = templates[mappedGoal] || templates["muscle_gain"];
      if (mappedExperience === "beginner") {
        plan = { ...plan, exercises: plan.exercises.map((e) => ({
          ...e, sets: Math.max(2, e.sets - 1), reps: Math.max(6, e.reps - 2),
        }))};
      } else if (mappedExperience === "advanced") {
        plan = { ...plan, exercises: plan.exercises.map((e) => ({
          ...e, sets: e.sets + 1, reps: e.reps + 2,
        }))};
      }
      await new Promise((r) => setTimeout(r, 800));
      setWorkoutPlan(plan);
    } catch (err) {
      console.error("Workout generation error:", err);
      alert("Failed to generate workout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Video Demo Handler ──────────────────────────────────────────────────────
  const handleShowVideo = async (exerciseName: string) => {
    if (!profileGoalRaw) {
      alert("Please set a fitness goal in your profile first.");
      return;
    }

    setVideoDemoLoading(true);
    try {
      // First try to find in current videos
      let foundVideo = videos.find(v => 
        v.title.toLowerCase().includes(exerciseName.toLowerCase()) ||
        exerciseName.toLowerCase().includes(v.title.toLowerCase().split(" ")[0])
      );

      if (!foundVideo) {
        // Search specifically
        const params = new URLSearchParams({
          goal: profileGoalRaw,
          exercise: exerciseName,
        });
        const url = `${API_URL}/api/exercises/videos?${params.toString()}`;
        const res = await fetch(url, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.videos && data.videos.length > 0) {
            foundVideo = data.videos[0];
          }
        }
      }

      if (foundVideo) {
        setSelectedVideo(foundVideo);
      } else {
        // Try fallback
        const goalKey = GOAL_MAPPING[profileGoalRaw?.toLowerCase() ?? ""] || "general";
        const fallback = FALLBACK_VIDEOS[goalKey] || FALLBACK_VIDEOS["general"];
        if (fallback.length > 0) {
          setSelectedVideo(fallback[0]);
        } else {
          setVideosError(`No demo video found for "${exerciseName}".`);
        }
      }
    } catch (err) {
      console.error("Video demo error:", err);
      setVideosError("Could not load the demo video. Check your connection.");
    } finally {
      setVideoDemoLoading(false);
    }
  };

  const selectCls = "w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="min-h-screen bg-slate-900">
      <TopNavBar />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 pt-20">

        <ExerciseVideoModal 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />

        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Workout Planner</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Generate personalised plans — saved workouts appear on your Progress page
          </p>
        </div>

        {/* Hero banner */}
        <div className="mb-4 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
          <div className="relative w-full h-44 sm:h-52 md:h-60">
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80" 
              alt="Gym workout"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Push Your Limits 💪</h2>
              <p className="text-green-300 font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Complete a workout and save — your Progress page updates automatically
              </p>
              <button 
                onClick={() => { if (!workoutPlan) generateWorkout(); }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                Start Workout 🔥
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-slate-700 overflow-x-auto">
          {[
            { id: "generate", label: "Generate New" },
            { id: "library",  label: "Video Library" },
            { id: "history",  label: `History (${workoutHistory.length})` },
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-green-400 border-b-2 border-green-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generate tab */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow">
              <h2 className="text-sm font-bold text-slate-100 mb-4">Create Workout</h2>

              {profileLoading && (
                <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg text-center">
                  <p className="text-xs text-blue-300">📡 Loading your profile...</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Fitness Goal {profileGoalRaw && <span className="text-green-400 text-xs">(from profile: {profileGoalRaw})</span>}
                  </label>
                  <input
                    type="text"
                    value={fitnessGoal || ""}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    placeholder={profileGoalRaw || "Select or enter fitness goal..."}
                    className={selectCls}
                    disabled={profileLoading}
                    list="fitness-goals"
                  />
                  <datalist id="fitness-goals">
                    <option value="Build Muscle" />
                    <option value="Lose Weight" />
                    <option value="Strength Training" />
                    <option value="Core Strength" />
                    <option value="Hip Mobility" />
                    <option value="Improve Flexibility" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Experience Level {profileExperienceRaw && <span className="text-green-400 text-xs">(from profile: {profileExperienceRaw})</span>}
                  </label>
                  <select
                    value={experience || ""}
                    onChange={(e) => setExperience(e.target.value)}
                    className={selectCls}
                    disabled={profileLoading}
                  >
                    <option value="">Select experience level...</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Duration (minutes) {profileDurationRaw && <span className="text-green-400 text-xs">(from profile: {profileDurationRaw})</span>}
                  </label>
                  <input
                    type="number"
                    value={duration || ""}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder={profileDurationRaw || "Enter duration in minutes..."}
                    min="15"
                    max="180"
                    className={selectCls}
                    disabled={profileLoading}
                  />
                </div>
              </div>
              <button 
                onClick={generateWorkout} 
                disabled={loading || profileLoading}
                className="w-full mt-4 bg-green-600 text-white py-2.5 text-sm rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⚙️</span> Generating...</span>
                  : "Generate Workout"}
              </button>
            </div>

            <div className="lg:col-span-2">
              {workoutPlan ? (
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">{workoutPlan.day}</h2>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {experience?.charAt(0).toUpperCase()}{experience?.slice(1)} &bull; {duration} min &bull; {workoutPlan.exercises.length} exercises
                      </p>
                    </div>
                    <button 
                      onClick={() => { setWorkoutPlan(null); setTimerActive(false); setElapsedTime(0); }}
                      className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {workoutPlan.exercises.map((exercise, idx) => (
                      <ExerciseCard
                        key={idx}
                        exercise={exercise}
                        onShowVideo={handleShowVideo}
                        isLoading={videoDemoLoading}
                      />
                    ))}
                  </div>
                  {timerActive && (
                    <div className="mt-4 bg-green-900/30 border border-green-500/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-300 mb-1">Workout Timer</p>
                      <p className="text-3xl font-bold text-green-400 font-mono">{formatTime(elapsedTime)}</p>
                    </div>
                  )}
                  <button 
                    onClick={toggleTimer}
                    className={`w-full mt-4 py-2.5 text-sm rounded-xl font-semibold transition-colors text-white ${
                      timerActive ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                    }`}
                  >
                    {timerActive ? "Finish Workout" : "Start Workout Timer"}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Finish the timer to save to your Progress page
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-600 h-full min-h-[200px] flex flex-col items-center justify-center text-center p-8">
                  <div className="text-4xl mb-3">🏋️</div>
                  <p className="text-slate-400 text-sm font-medium">No workout generated yet</p>
                  <p className="text-slate-500 text-xs mt-1">Configure options and click Generate Workout</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video Library tab */}
        {activeTab === "library" && (
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-100">🎥 Exercise Video Library</h2>
                <p className="text-slate-400 text-xs mt-1">
                  {profileGoalRaw ? (
                    <>YouTube results for your fitness goal — <span className="text-green-400 font-medium">{profileGoalRaw}</span></>
                  ) : (
                    "Set a fitness goal in your profile to see tailored exercise demos."
                  )}
                </p>
              </div>
              <button
                onClick={() => fetchVideos()}
                disabled={videosLoading || !profileGoalRaw}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
              >
                {videosLoading ? "Searching..." : "🔄 Refresh"}
              </button>
            </div>

            {!profileGoalRaw && (
              <div className="mb-5 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-xl text-center">
                <p className="text-sm text-yellow-300">
                  Set a fitness goal in your profile to see exercise demos tailored to it.
                </p>
              </div>
            )}

            {profileGoalRaw && (
              <div className="mb-5 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Optional: narrow the search, e.g. 'squat', 'plank', 'stretch'..."
                  value={videoSearchTerm}
                  onChange={(e) => setVideoSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchVideos(); }}
                  className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={() => fetchVideos()}
                  disabled={videosLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-semibold transition-colors shrink-0"
                >
                  Search
                </button>
              </div>
            )}

            {videosLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Searching YouTube for exercises matching your goal...</p>
              </div>
            )}

            {!videosLoading && videosError && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm mb-1">{videosError}</p>
                <button
                  onClick={() => fetchVideos()}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!videosLoading && !videosError && videos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <div
                    key={video.youtube_id}
                    onClick={() => setSelectedVideo(video)}
                    className="bg-slate-700 rounded-xl overflow-hidden border border-slate-600 hover:border-green-500 cursor-pointer transition-all hover:shadow-lg group"
                  >
                    <div className="relative aspect-video bg-slate-900">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://img.youtube.com/vi/" + video.youtube_id + "/mqdefault.jpg";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="text-3xl opacity-0 group-hover:opacity-100 transition-opacity">▶️</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-100 text-sm line-clamp-2 mb-1">{video.title}</h3>
                      <p className="text-xs text-slate-400 mb-3">{video.channel}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedVideo(video); }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-colors"
                      >
                        View Demo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!videosLoading && !videosError && videos.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">No videos found. Try a different search term.</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-slate-700/50 border border-slate-600 rounded-xl">
              <p className="text-xs text-slate-400">
                <span className="font-semibold">💡 Tip:</span> Results come from YouTube, scoped to your
                fitness goal in your profile. Narrow the search above to find demos for a specific exercise.
              </p>
            </div>
          </div>
        )}

        {/* History tab */}
        {activeTab === "history" && (
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow">
            <h2 className="text-sm font-bold text-slate-100 mb-4">Workout History</h2>
            {workoutHistory.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-400 text-sm">No workouts saved yet</p>
                <p className="text-slate-500 text-xs mt-1">Complete a workout using the timer to save it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workoutHistory.map((w) => (
                  <div key={w.id}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors border border-slate-600"
                  >
                    <div>
                      <p className="font-semibold text-slate-100 text-sm">{w.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(w.date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })} &bull; {w.duration} min &bull; {w.exercises} exercises
                      </p>
                    </div>
                    <button
                      onClick={() => { setWorkoutPlan({ day: w.name, exercises: [] }); setActiveTab("generate"); }}
                      className="text-green-400 hover:text-green-300 font-semibold text-xs px-3 py-1.5 rounded-lg bg-green-900/30 hover:bg-green-900/50 transition-colors shrink-0"
                    >
                      Repeat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}