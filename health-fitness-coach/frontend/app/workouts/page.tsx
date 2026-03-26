"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// ─── Sync helpers (inlined — no separate file needed) ─────────────────────────
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

// ─── Exercise card (defined outside component to prevent focus loss) ──────────
function ExerciseCard({ exercise }: { exercise: WorkoutPlan["exercises"][0] }) {
  return (
    <div className="bg-slate-700 rounded-xl p-4 border-l-4 border-green-500 hover:bg-slate-600/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-100">{exercise.name}</h3>
        <input type="checkbox" className="w-4 h-4 accent-green-500" />
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

// ═════════════════════════════════════════════════════════════════════════════
// Workouts Page
// ═════════════════════════════════════════════════════════════════════════════
export default function Workouts() {
  const { user } = useAuth();

  const [fitnessGoal,    setFitnessGoal]    = useState("muscle-gain");
  const [duration,       setDuration]       = useState("45");
  const [experience,     setExperience]     = useState("intermediate");
  const [workoutPlan,    setWorkoutPlan]    = useState<WorkoutPlan | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [activeTab,      setActiveTab]      = useState("generate");
  const [timerActive,    setTimerActive]    = useState(false);
  const [elapsedTime,    setElapsedTime]    = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState<SavedWorkout[]>([]);

  useEffect(() => {
    if (!user) return;
    setWorkoutHistory(readList<SavedWorkout>(user.id, KEYS.workoutHistory));
  }, [user?.id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (s: number) => {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const saveWorkout = (secs: number) => {
    if (!workoutPlan || !user) return;
    const w: SavedWorkout = {
      id:        Date.now().toString(),
      name:      workoutPlan.day,
      date:      new Date().toISOString(),
      duration:  Math.floor(secs / 60),
      exercises: workoutPlan.exercises.length,
    };
    const updated = [w, ...workoutHistory];
    setWorkoutHistory(updated);
    writeData(user.id, KEYS.workoutHistory, updated);

    // Update dashboard stats cache
    const today      = new Date().toDateString();
    const todayWorks = updated.filter((x) => new Date(x.date).toDateString() === today);
    writeData(user.id, KEYS.dashboardStats, {
      workoutCount:   todayWorks.length,
      totalMinutes:   todayWorks.reduce((s, x) => s + x.duration, 0),
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

  const generateWorkout = async () => {
    setLoading(true);
    try {
      const templates: Record<string, WorkoutPlan> = {
        "muscle-gain": {
          day: "Upper Body Hypertrophy",
          exercises: [
            { name: "Barbell Bench Press",    sets: 4, reps: 8,  weight: "185 lbs" },
            { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: "60 lbs"  },
            { name: "Cable Flyes",            sets: 3, reps: 12, weight: "40 lbs"  },
            { name: "Bent Over Rows",         sets: 4, reps: 8,  weight: "165 lbs" },
            { name: "Pull-ups",               sets: 3, reps: 10, weight: "BW"      },
            { name: "Overhead Press",         sets: 3, reps: 10, weight: "95 lbs"  },
            { name: "Lateral Raises",         sets: 3, reps: 12, weight: "25 lbs"  },
          ],
        },
        "fat-loss": {
          day: "Full Body Circuit",
          exercises: [
            { name: "Burpees",           sets: 3, reps: 15,  weight: "BW"  },
            { name: "Mountain Climbers", sets: 3, reps: 20,  weight: "BW"  },
            { name: "Jump Squats",       sets: 4, reps: 12,  weight: "BW"  },
            { name: "Push-ups",          sets: 3, reps: 15,  weight: "BW"  },
            { name: "High Knees",        sets: 3, reps: 30,  weight: "BW"  },
            { name: "Plank",             sets: 3, reps: 60,  weight: "sec" },
            { name: "Jump Rope",         sets: 3, reps: 100, weight: "BW"  },
          ],
        },
        strength: {
          day: "Powerlifting Focus",
          exercises: [
            { name: "Barbell Squat",  sets: 5, reps: 5, weight: "225 lbs" },
            { name: "Deadlift",       sets: 4, reps: 5, weight: "275 lbs" },
            { name: "Bench Press",    sets: 5, reps: 5, weight: "185 lbs" },
            { name: "Overhead Press", sets: 3, reps: 5, weight: "115 lbs" },
            { name: "Barbell Rows",   sets: 4, reps: 6, weight: "155 lbs" },
          ],
        },
        endurance: {
          day: "Cardio & Endurance",
          exercises: [
            { name: "Running",        sets: 1, reps: 30,  weight: "min" },
            { name: "Cycling",        sets: 1, reps: 20,  weight: "min" },
            { name: "Box Jumps",      sets: 4, reps: 15,  weight: "BW"  },
            { name: "Battle Ropes",   sets: 4, reps: 30,  weight: "sec" },
            { name: "Rowing Machine", sets: 3, reps: 500, weight: "m"   },
            { name: "Air Squats",     sets: 4, reps: 25,  weight: "BW"  },
          ],
        },
        flexibility: {
          day: "Flexibility & Mobility",
          exercises: [
            { name: "Dynamic Stretching", sets: 2, reps: 10, weight: "min"  },
            { name: "Yoga Flow",          sets: 1, reps: 20, weight: "min"  },
            { name: "Foam Rolling",       sets: 1, reps: 10, weight: "min"  },
            { name: "Hip Flexor Stretch", sets: 3, reps: 30, weight: "sec"  },
            { name: "Hamstring Stretch",  sets: 3, reps: 30, weight: "sec"  },
            { name: "Shoulder Mobility",  sets: 3, reps: 15, weight: "reps" },
          ],
        },
      };

      let plan = templates[fitnessGoal] || templates["muscle-gain"];
      if (experience === "beginner") {
        plan = { ...plan, exercises: plan.exercises.map((e) => ({
          ...e, sets: Math.max(2, e.sets - 1), reps: Math.max(6, e.reps - 2),
        }))};
      } else if (experience === "advanced") {
        plan = { ...plan, exercises: plan.exercises.map((e) => ({
          ...e, sets: e.sets + 1, reps: e.reps + 2,
        }))};
      }
      await new Promise((r) => setTimeout(r, 800));
      setWorkoutPlan(plan);
    } catch {
      alert("Failed to generate workout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectCls = "w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5">

      <div className="text-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Workout Planner</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Generate personalised plans — saved workouts appear on your Progress page
        </p>
      </div>

      {/* Hero banner */}
      <div className="mb-4 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
        <div className="relative w-full h-44 sm:h-52 md:h-60">
          <img src="/images/gym-workout.jpg" alt="Gym workout"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Push Your Limits 💪</h2>
            <p className="text-slate-300 text-xs mb-3 hidden sm:block">
              Complete a workout and save it — your Progress page updates automatically
            </p>
            <button onClick={() => { if (!workoutPlan) generateWorkout(); }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
              Start Workout 🔥
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-700">
        {[
          { id: "generate", label: "Generate New" },
          { id: "history",  label: `History (${workoutHistory.length})` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "text-green-400 border-b-2 border-green-400"
                : "text-slate-400 hover:text-slate-200"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Generate tab */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow">
            <h2 className="text-sm font-bold text-slate-100 mb-4">Create Workout</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Fitness Goal</label>
                <select value={fitnessGoal} onChange={(e) => setFitnessGoal(e.target.value)} className={selectCls}>
                  <option value="muscle-gain">Muscle Building</option>
                  <option value="fat-loss">Fat Loss</option>
                  <option value="strength">Strength Training</option>
                  <option value="endurance">Endurance</option>
                  <option value="flexibility">Flexibility</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Experience Level</label>
                <select value={experience} onChange={(e) => setExperience(e.target.value)} className={selectCls}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (minutes)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                  min="15" max="180" className={selectCls} />
              </div>
            </div>
            <button onClick={generateWorkout} disabled={loading}
              className="w-full mt-4 bg-green-600 text-white py-2.5 text-sm rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
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
                      {experience.charAt(0).toUpperCase() + experience.slice(1)} &bull; {duration} min &bull; {workoutPlan.exercises.length} exercises
                    </p>
                  </div>
                  <button onClick={() => { setWorkoutPlan(null); setTimerActive(false); setElapsedTime(0); }}
                    className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                    ✕
                  </button>
                </div>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {workoutPlan.exercises.map((exercise, idx) => (
                    <ExerciseCard key={idx} exercise={exercise} />
                  ))}
                </div>
                {timerActive && (
                  <div className="mt-4 bg-green-900/30 border border-green-500/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-300 mb-1">Workout Timer</p>
                    <p className="text-3xl font-bold text-green-400 font-mono">{formatTime(elapsedTime)}</p>
                  </div>
                )}
                <button onClick={toggleTimer}
                  className={`w-full mt-4 py-2.5 text-sm rounded-xl font-semibold transition-colors text-white ${
                    timerActive ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                  }`}>
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
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors border border-slate-600">
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
                    className="text-green-400 hover:text-green-300 font-semibold text-xs px-3 py-1.5 rounded-lg bg-green-900/30 hover:bg-green-900/50 transition-colors shrink-0">
                    Repeat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}