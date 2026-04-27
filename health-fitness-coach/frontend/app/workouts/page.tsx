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

// ─── Exercise Video Library ────────────────────────────────────────────────────
interface ExerciseDemo {
  name: string;
  videoUrl: string;
  instructions: string[];
  muscleGroups: string[];
  goals: string[]; // Goals this exercise supports: "build-muscle", "fat-loss", "strength", "endurance", "flexibility"
}

const EXERCISE_VIDEO_LIBRARY: Record<string, ExerciseDemo> = {
  "Barbell Bench Press": {
    name: "Barbell Bench Press",
    videoUrl: "https://www.youtube.com/embed/rT7DgCr-3pg",
    instructions: [
      "Lie flat on a bench with feet on the ground",
      "Grip the barbell slightly wider than shoulder width",
      "Lower the barbell to your chest in a controlled manner",
      "Press the barbell upward until arms are extended",
      "Keep your back and buttocks on the bench"
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    goals: ["build-muscle", "strength"]
  },
  "Incline Dumbbell Press": {
    name: "Incline Dumbbell Press",
    videoUrl: "https://www.youtube.com/embed/8iPEnn-ltC8",
    instructions: [
      "Set incline bench to 45 degrees",
      "Hold dumbbells at shoulder height",
      "Press dumbbells upward and forward",
      "Lower dumbbells back to shoulder level",
      "Maintain control throughout the movement"
    ],
    muscleGroups: ["Upper Chest", "Shoulders", "Triceps"],
    goals: ["build-muscle", "strength"]
  },
  "Cable Flyes": {
    name: "Cable Flyes",
    videoUrl: "https://www.youtube.com/embed/Iwe6AmxVf7o",
    instructions: [
      "Set cables to shoulder height",
      "Stand in the center with slight knee bend",
      "Bring hands together in a hugging motion",
      "Feel the stretch across your chest",
      "Return to starting position with control"
    ],
    muscleGroups: ["Chest", "Front Shoulders"],
    goals: ["build-muscle"]
  },
  "Bent Over Rows": {
    name: "Bent Over Rows",
    videoUrl: "https://www.youtube.com/embed/vT2GjY_Umpw",
    instructions: [
      "Bend at the hips with a slight knee bend",
      "Keep your back straight and core tight",
      "Pull the barbell toward your lower chest",
      "Squeeze your shoulder blades together",
      "Lower the barbell with control"
    ],
    muscleGroups: ["Back", "Biceps", "Rear Shoulders"],
    goals: ["build-muscle", "strength", "posture"]
  },
  "Pull-ups": {
    name: "Pull-ups",
    videoUrl: "https://www.youtube.com/embed/eGo4IYlbE5g",
    instructions: [
      "Hang from the bar with a shoulder-width grip",
      "Pull your body upward until chin is above the bar",
      "Keep your core engaged throughout",
      "Lower yourself with control",
      "Avoid swinging"
    ],
    muscleGroups: ["Back", "Biceps", "Core"],
    goals: ["build-muscle", "strength", "endurance"]
  },
  "Overhead Press": {
    name: "Overhead Press",
    videoUrl: "https://www.youtube.com/embed/2yjwXTZQDDI",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Hold barbell at shoulder height",
      "Press the barbell overhead until arms are straight",
      "Keep your core tight and avoid arching excessively",
      "Lower the barbell to shoulder height"
    ],
    muscleGroups: ["Shoulders", "Triceps", "Upper Chest"],
    goals: ["build-muscle", "strength"]
  },
  "Lateral Raises": {
    name: "Lateral Raises",
    videoUrl: "https://www.youtube.com/embed/3VcKaXpzro",
    instructions: [
      "Stand with dumbbells at your sides",
      "Raise dumbbells to shoulder height",
      "Keep elbows slightly bent",
      "Feel the contraction in your shoulders",
      "Lower dumbbells with control"
    ],
    muscleGroups: ["Side Shoulders", "Shoulder Stability"],
    goals: ["build-muscle"]
  },
  "Barbell Squat": {
    name: "Barbell Squat",
    videoUrl: "https://www.youtube.com/embed/ultWZbUMPL8",
    instructions: [
      "Place barbell on your upper back",
      "Stand with feet shoulder-width apart",
      "Lower your body by bending knees and hips",
      "Go down until thighs are parallel to the ground",
      "Press through your heels to return to standing"
    ],
    muscleGroups: ["Quadriceps", "Glutes", "Hamstrings", "Core"],
    goals: ["build-muscle", "strength", "lower-body-strength"]
  },
  "Deadlift": {
    name: "Deadlift",
    videoUrl: "https://www.youtube.com/embed/op9kVnSso6Q",
    instructions: [
      "Stand with feet hip-width apart, bar over mid-foot",
      "Bend hips and knees to grip the bar",
      "Keep your back straight and chest up",
      "Drive through your heels to stand up",
      "Lower the bar with control back to the ground"
    ],
    muscleGroups: ["Back", "Glutes", "Hamstrings", "Legs"],
    goals: ["build-muscle", "strength"]
  },
  "Burpees": {
    name: "Burpees",
    videoUrl: "https://www.youtube.com/embed/TU8QYVW0gDU",
    instructions: [
      "Start in a standing position",
      "Drop into a plank position with hands on the ground",
      "Do a push-up",
      "Jump your feet back toward your hands",
      "Jump upward explosively"
    ],
    muscleGroups: ["Full Body", "Cardiovascular"],
    goals: ["fat-loss", "endurance", "full-body"]
  },
  "Mountain Climbers": {
    name: "Mountain Climbers",
    videoUrl: "https://www.youtube.com/embed/nmwgirgXLYM",
    instructions: [
      "Start in a plank position",
      "Bring one knee toward your chest",
      "Quickly switch legs in a running motion",
      "Keep your core tight and hips level",
      "Maintain a steady pace"
    ],
    muscleGroups: ["Core", "Chest", "Legs", "Cardiovascular"],
    goals: ["fat-loss", "endurance", "core-strength"]
  },
  "Jump Squats": {
    name: "Jump Squats",
    videoUrl: "https://www.youtube.com/embed/U4s4mEQ5VqU",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Lower into a squat position",
      "Explode upward and jump",
      "Land softly and immediately lower into the next rep",
      "Keep your chest up and core engaged"
    ],
    muscleGroups: ["Legs", "Glutes", "Cardiovascular"],
    goals: ["fat-loss", "glute-strength"]
  },
  "Push-ups": {
    name: "Push-ups",
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
    instructions: [
      "Start in a plank position with hands shoulder-width apart",
      "Lower your body until chest nearly touches the ground",
      "Keep your elbows close to your body",
      "Press back up to the starting position",
      "Keep your body in a straight line"
    ],
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    goals: ["build-muscle", "strength", "fat-loss"]
  },
  "Plank": {
    name: "Plank",
    videoUrl: "https://www.youtube.com/embed/ASdvN_XEl_c",
    instructions: [
      "Start in a push-up position",
      "Lower onto your forearms",
      "Keep your body in a straight line from head to heels",
      "Engage your core and glutes",
      "Hold for the specified duration"
    ],
    muscleGroups: ["Core", "Shoulders", "Back"],
    goals: ["core-strength", "fat-loss"]
  },
  "High Knees": {
    name: "High Knees",
    videoUrl: "https://www.youtube.com/embed/8opcQdC-V-U",
    instructions: [
      "Stand in place and begin running",
      "Lift your knees to hip height with each step",
      "Drive your arms in a running motion",
      "Move at a fast, controlled pace",
      "Maintain proper posture"
    ],
    muscleGroups: ["Hip Flexors", "Cardiovascular"],
    goals: ["fat-loss", "endurance"]
  },
  "Jump Rope": {
    name: "Jump Rope",
    videoUrl: "https://www.youtube.com/embed/FJmRQ5iTXKE",
    instructions: [
      "Hold rope handles at waist height with elbows bent",
      "Jump with both feet together or in a running motion",
      "Keep your core tight and shoulders relaxed",
      "Land softly on the balls of your feet",
      "Maintain a steady rhythm"
    ],
    muscleGroups: ["Calves", "Cardiovascular", "Core"],
    goals: ["fat-loss", "endurance", "cardiovascular-health"]
  },
  "Glute Bridges": {
    name: "Glute Bridges",
    videoUrl: "https://www.youtube.com/embed/wFQaRKu_sS0",
    instructions: [
      "Lie on your back with knees bent and feet flat",
      "Push through your heels to lift your hips",
      "Squeeze your glutes at the top",
      "Keep your back neutral and avoid arching",
      "Lower back down with control"
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Core"],
    goals: ["glute-strength", "lower-body-strength"]
  },
  "Leg Press": {
    name: "Leg Press",
    videoUrl: "https://www.youtube.com/embed/1gqJDV8Gfaw",
    instructions: [
      "Sit in the machine with your back against the pad",
      "Place feet shoulder-width apart on the platform",
      "Lower the platform by bending your knees",
      "Drive through your heels to extend your legs",
      "Stop just short of locking out at the top"
    ],
    muscleGroups: ["Quadriceps", "Glutes", "Hamstrings"],
    goals: ["build-muscle", "lower-body-strength"]
  },
  "Walking Lunges": {
    name: "Walking Lunges",
    videoUrl: "https://www.youtube.com/embed/g-IWlKQ5GLE",
    instructions: [
      "Stand with feet hip-width apart",
      "Step forward and lower your back knee toward the ground",
      "Keep your torso upright and front knee over ankle",
      "Push back to standing and step forward with opposite leg",
      "Maintain a steady rhythm"
    ],
    muscleGroups: ["Quadriceps", "Glutes", "Hamstrings"],
    goals: ["lower-body-strength", "fat-loss"]
  },
  "Yoga Sun Salutation": {
    name: "Yoga Sun Salutation",
    videoUrl: "https://www.youtube.com/embed/h7LnNmf41rM",
    instructions: [
      "Start in mountain pose with palms together",
      "Inhale and raise arms overhead",
      "Exhale and fold forward",
      "Step or jump back to plank position",
      "Continue flowing through the sequence with breath"
    ],
    muscleGroups: ["Full Body", "Flexibility"],
    goals: ["flexibility", "stress-relief", "better-sleep"]
  },
  "Foam Rolling": {
    name: "Foam Rolling",
    videoUrl: "https://www.youtube.com/embed/9L6VBb-qBzc",
    instructions: [
      "Start with calves, rolling slowly over the foam roller",
      "Stop on tender areas and hold for 10-20 seconds",
      "Continue to hamstrings, IT band, and back",
      "Never roll directly on joints or spine",
      "Use controlled, deliberate movements"
    ],
    muscleGroups: ["All Muscles", "Mobility"],
    goals: ["flexibility", "hip-mobility", "recovery"]
  },
  "Stretching Routine": {
    name: "Full Body Stretching Routine",
    videoUrl: "https://www.youtube.com/embed/1QC4HBqYFqE",
    instructions: [
      "Start with a 5-minute light warm-up",
      "Hold each stretch for 20-30 seconds",
      "Focus on major muscle groups",
      "Avoid bouncing while stretching",
      "Breathe deeply and relax into each stretch"
    ],
    muscleGroups: ["Full Body", "Flexibility"],
    goals: ["flexibility", "improve-flexibility", "recovery"]
  },
};

// ─── Exercise card (defined outside component to prevent focus loss) ──────────
function ExerciseCard({ 
  exercise, 
  onShowVideo 
}: { 
  exercise: WorkoutPlan["exercises"][0],
  onShowVideo: (exerciseName: string) => void
}) {
  return (
    <div className="bg-slate-700 rounded-xl p-4 border-l-4 border-green-500 hover:bg-slate-600/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-100">{exercise.name}</h3>
        <div className="flex items-center gap-2">
          {EXERCISE_VIDEO_LIBRARY[exercise.name] && (
            <button 
              onClick={() => onShowVideo(exercise.name)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              title="View exercise demo"
            >
              🎥 Demo
            </button>
          )}
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

// ─── Comprehensive goal mapping - all fitness goals to workout templates
const GOAL_MAPPING: Record<string, string> = {
  "muscle-building": "muscle-gain",
  "muscle gain": "muscle-gain",
  "build-muscle": "muscle-gain",
  "muscle-gain": "muscle-gain",
  "weight loss": "fat-loss",
  "fat loss": "fat-loss",
  "lose-weight": "fat-loss",
  "weight-loss": "fat-loss",
  "strength": "strength",
  "strength-training": "strength",
  "endurance": "endurance",
  "improve-endurance": "endurance",
  "cardio": "endurance",
  "cardiovascular health": "endurance",
  "flexibility": "flexibility",
  "improve-flexibility": "flexibility",
  "mobility": "flexibility",
  "hip-mobility": "flexibility",
  "stress relief": "flexibility",
  "better sleep": "flexibility",
  "stay active": "endurance",
  "stay active / maintain": "endurance",
  "lower body strength & shape": "strength",
  "lower-body-strength": "strength",
  "glute strength": "strength",
  "glute-strength": "strength",
  "core strength": "strength",
  "core-strength": "strength",
};

// ═════════════════════════════════════════════════════════════════════════════
// Workouts Page
// ═════════════════════════════════════════════════════════════════════════════
export default function Workouts() {
  const { user } = useAuth();

  // Store RAW profile values (exactly as entered by user, no mapping)
  const [profileGoalRaw,      setProfileGoalRaw]      = useState<string | null>(null);
  const [profileExperienceRaw, setProfileExperienceRaw] = useState<string | null>(null);
  const [profileDurationRaw,  setProfileDurationRaw]  = useState<string | null>(null);

  // Form values (what user can edit)
  const [fitnessGoal,    setFitnessGoal]    = useState<string | null>(null);
  const [duration,       setDuration]       = useState<string | null>(null);
  const [experience,     setExperience]     = useState<string | null>(null);

  const [workoutPlan,    setWorkoutPlan]    = useState<WorkoutPlan | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab,      setActiveTab]      = useState("generate");
  const [timerActive,    setTimerActive]    = useState(false);
  const [elapsedTime,    setElapsedTime]    = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState<SavedWorkout[]>([]);
  const [userProfile,    setUserProfile]    = useState<any>(null);
  const [selectedExerciseVideo, setSelectedExerciseVideo] = useState<ExerciseDemo | null>(null);
  
  // Video library search and filter state
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [videoGoalFilter, setVideoGoalFilter] = useState<string>("all");

  // Load user profile and sync in real-time
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    
    setProfileLoading(true);
    
    // Load initial history
    setWorkoutHistory(readList<SavedWorkout>(user.id, KEYS.workoutHistory));

    // Function to load and apply profile preferences
    const loadAndSyncProfile = () => {
      try {
        // Try scoped key first, then fallback to global key
        let savedProfile = localStorage.getItem(`user_${user.id}_userProfile`);
        if (!savedProfile) {
          savedProfile = localStorage.getItem("userProfile");
        }
        
        console.log("📋 Looking for profile...");
        console.log("   - Scoped:", localStorage.getItem(`user_${user.id}_userProfile`) ? "✅ Found" : "❌ Not found");
        console.log("   - Global:", localStorage.getItem("userProfile") ? "✅ Found" : "❌ Not found");
        
        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          console.log("✅ Parsed profile:", profile);
          setUserProfile(profile);
          
          // Store RAW values (exactly as entered - no mapping for display)
          if (profile.primaryGoal) {
            console.log(`📌 Raw Goal: "${profile.primaryGoal}"`);
            setProfileGoalRaw(profile.primaryGoal);
            setFitnessGoal(profile.primaryGoal); // Display exact profile value
          }
          
          if (profile.experienceLevel) {
            console.log(`📌 Raw Experience: "${profile.experienceLevel}"`);
            setProfileExperienceRaw(profile.experienceLevel);
            setExperience(profile.experienceLevel); // Display exact profile value
          }
          
          if (profile.workoutDuration) {
            const durationMins = profile.workoutDuration.replace(/[^\d]/g, "");
            if (durationMins) {
              console.log(`📌 Raw Duration: ${durationMins} minutes`);
              setProfileDurationRaw(durationMins);
              setDuration(durationMins); // Display exact profile value
            }
          }
        } else {
          console.warn("❌ No profile found - fields will be empty");
          // NO defaults - leave fields empty if profile doesn't exist
        }
      } catch (err) {
        console.error("❌ Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    // Load profile on mount
    loadAndSyncProfile();

    // Listen for real-time profile updates from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      console.log("🔄 Storage event detected:", e.key);
      if (e.key === `user_${user.id}_userProfile` || e.key === "userProfile") {
        console.log("📡 Profile changed - reloading...");
        loadAndSyncProfile();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
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
      // Map the FORM value (which might be raw profile value) to workout template
      const mappedGoal = GOAL_MAPPING[fitnessGoal?.toLowerCase() ?? ""] || fitnessGoal || "muscle-gain";
      const mappedExperience = experience?.toLowerCase() || "intermediate";
      
      console.log(`🎬 Generating workout with:`);
      console.log(`   - Goal: "${fitnessGoal}" → "${mappedGoal}"`);
      console.log(`   - Experience: "${mappedExperience}"`);
      console.log(`   - Duration: "${duration}" minutes`);
      
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

      let plan = templates[mappedGoal] || templates["muscle-gain"];
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
    } catch {
      alert("Failed to generate workout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectCls = "w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500";

  // ─── Exercise Video Modal ─────────────────────────────────────────────────────
  const ExerciseVideoModal = ({ exercise }: { exercise: ExerciseDemo | null }) => {
    if (!exercise) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">🎥 {exercise.name}</h2>
            <button 
              onClick={() => setSelectedExerciseVideo(null)}
              className="text-slate-400 hover:text-slate-200 text-2xl font-bold transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={exercise.videoUrl}
                title={exercise.name}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>

            {/* Muscle Groups */}
            {exercise.muscleGroups.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">💪 Primary Muscles</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.muscleGroups.map((muscle) => (
                    <span key={muscle} className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fitness Goals */}
            {exercise.goals.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">🎯 Fitness Goals</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.goals.map((goal) => (
                    <span key={goal} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                      {goal.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-3">📋 Instructions</h3>
                <ol className="space-y-2">
                  {exercise.instructions.map((instruction, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedExerciseVideo(null)}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5">

      {/* Exercise Video Modal */}
      <ExerciseVideoModal exercise={selectedExerciseVideo} />

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
            <p className="text-green-300 font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
  Complete a workout and save — your Progress page updates automatically
</p>
            <button onClick={() => { if (!workoutPlan) generateWorkout(); }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
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
                  <option value="Muscle Gain" />
                  <option value="Lose Weight" />
                  <option value="Weight Loss" />
                  <option value="Strength Training" />
                  <option value="Core Strength" />
                  <option value="Lower Body Strength & Shape" />
                  <option value="Glute Strength" />
                  <option value="Improve Endurance" />
                  <option value="Endurance" />
                  <option value="Cardio & Health" />
                  <option value="Cardiovascular Health" />
                  <option value="Stay Active / Maintain" />
                  <option value="Improve Flexibility" />
                  <option value="Flexibility" />
                  <option value="Hip Mobility" />
                  <option value="Stress Relief" />
                  <option value="Better Sleep" />
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
            <button onClick={generateWorkout} disabled={loading}
              className="w-full mt-4 bg-green-600 text-white py-2.5 text-sm rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⚙️</span> Generating...</span>
                : "Generate Workout"}
            </button>
            <button onClick={() => {
              try {
                console.log("🔄 Manual refresh: Loading profile defaults...");
                // Try scoped key first, then fallback to global key
                let savedProfile = localStorage.getItem(`user_${user?.id}_userProfile`);
                if (!savedProfile) {
                  savedProfile = localStorage.getItem("userProfile");
                }
                
                if (savedProfile) {
                  const profile = JSON.parse(savedProfile);
                  console.log("✅ Found profile:", profile);
                  
                  if (profile.primaryGoal) {
                    const mapped = GOAL_MAPPING[profile.primaryGoal.toLowerCase()] || profile.primaryGoal.toLowerCase();
                    console.log(`🎯 Resetting goal to: ${mapped}`);
                    setFitnessGoal(mapped);
                  }
                  if (profile.experienceLevel) {
                    console.log(`💪 Resetting experience to: ${profile.experienceLevel}`);
                    setExperience(profile.experienceLevel.toLowerCase());
                  }
                  if (profile.workoutDuration) {
                    const durationMins = profile.workoutDuration.replace(/[^\d]/g, "");
                    if (durationMins) {
                      console.log(`⏱️  Resetting duration to: ${durationMins}`);
                      setDuration(durationMins);
                    }
                  }
                  console.log("✅ Reset to profile defaults");
                } else {
                  console.warn("⚠️ No profile found - nothing to reset");
                }
              } catch (err) {
                console.error("❌ Error resetting to defaults:", err);
              }
            }}
              className="w-full mt-2 bg-slate-700 text-slate-200 py-2 text-xs rounded-lg font-semibold hover:bg-slate-600 transition-colors">
              ↻ Use Profile Defaults
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
                    <ExerciseCard 
                      key={idx} 
                      exercise={exercise}
                      onShowVideo={(name) => {
                        const demo = EXERCISE_VIDEO_LIBRARY[name];
                        if (demo) setSelectedExerciseVideo(demo);
                      }}
                    />
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

      {/* Video Library tab */}
      {activeTab === "library" && (
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow">
          <h2 className="text-sm font-bold text-slate-100 mb-4">🎥 Exercise Video Library</h2>
          <p className="text-slate-400 text-xs mb-4">Browse all exercises with demo videos, instructions, and muscle groups worked</p>
          
          {/* Recommended for you section */}
          {profileGoalRaw && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-900/40 to-blue-900/40 border border-green-500/50 rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm mb-1">✨ Recommended for Your Goal</h3>
                  <p className="text-xs text-slate-400">Exercises tailored to your primary fitness goal: <span className="text-green-400 font-medium">{profileGoalRaw}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(EXERCISE_VIDEO_LIBRARY)
                  .filter(([name, demo]) => {
                    const mappedGoal = GOAL_MAPPING[profileGoalRaw.toLowerCase()] || profileGoalRaw.toLowerCase();
                    return demo.goals.includes(mappedGoal);
                  })
                  .slice(0, 3)
                  .map(([name, demo]) => (
                  <div 
                    key={name}
                    onClick={() => setSelectedExerciseVideo(demo)}
                    className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-green-400 cursor-pointer transition-all"
                  >
                    <h4 className="font-semibold text-slate-100 text-sm mb-1">{name}</h4>
                    <p className="text-xs text-slate-400 mb-2">{demo.muscleGroups.slice(0, 2).join(", ")}</p>
                    <button
                      onClick={() => setSelectedExerciseVideo(demo)}
                      className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Search and Filter Bar */}
          <div className="mb-5 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search exercises (e.g., chest, squat, cardio)..."
                value={videoSearchQuery}
                onChange={(e) => setVideoSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {videoSearchQuery && (
                <button
                  onClick={() => setVideoSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Goal Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setVideoGoalFilter("all")}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  videoGoalFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                All Exercises
              </button>
              {["build-muscle", "fat-loss", "strength", "endurance", "flexibility", "core-strength", "lower-body-strength", "glute-strength"].map((goal) => (
                <button
                  key={goal}
                  onClick={() => setVideoGoalFilter(goal)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                    videoGoalFilter === goal
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {goal.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))}
            </div>
          </div>
          
          {/* Filtered Exercises Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EXERCISE_VIDEO_LIBRARY)
              .filter(([name, demo]) => {
                const matchesSearch = name.toLowerCase().includes(videoSearchQuery.toLowerCase()) || 
                  demo.muscleGroups.some(m => m.toLowerCase().includes(videoSearchQuery.toLowerCase()));
                const matchesGoal = videoGoalFilter === "all" || demo.goals.includes(videoGoalFilter);
                return matchesSearch && matchesGoal;
              })
              .map(([name, demo]) => (
              <div 
                key={name}
                onClick={() => setSelectedExerciseVideo(demo)}
                className="bg-slate-700 rounded-xl p-4 border border-slate-600 hover:border-green-500 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-100 text-sm">{name}</h3>
                  <span className="text-lg">🎥</span>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-2">💪 Muscles:</p>
                  <div className="flex flex-wrap gap-1">
                    {demo.muscleGroups.slice(0, 2).map((muscle) => (
                      <span key={muscle} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        {muscle}
                      </span>
                    ))}
                    {demo.muscleGroups.length > 2 && (
                      <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded-full">
                        +{demo.muscleGroups.length - 2}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Goal Tags */}
                {demo.goals.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-1">🎯 Goals:</p>
                    <div className="flex flex-wrap gap-1">
                      {demo.goals.slice(0, 2).map((goal) => (
                        <span key={goal} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                          {goal.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        </span>
                      ))}
                      {demo.goals.length > 2 && (
                        <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded-full">
                          +{demo.goals.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedExerciseVideo(demo)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold transition-colors"
                >
                  View Demo
                </button>
              </div>
            ))}
          </div>
          
          {/* Empty State */}
          {Object.entries(EXERCISE_VIDEO_LIBRARY).filter(([name, demo]) => {
            const matchesSearch = name.toLowerCase().includes(videoSearchQuery.toLowerCase()) || 
              demo.muscleGroups.some(m => m.toLowerCase().includes(videoSearchQuery.toLowerCase()));
            const matchesGoal = videoGoalFilter === "all" || demo.goals.includes(videoGoalFilter);
            return matchesSearch && matchesGoal;
          }).length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm mb-2">No exercises found</p>
              <p className="text-slate-500 text-xs">Try adjusting your search or filters</p>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-slate-700/50 border border-slate-600 rounded-xl">
            <p className="text-xs text-slate-400">
              <span className="font-semibold">💡 Tips:</span> Use the search bar to find specific exercises, filter by fitness goal to see relevant exercises for your objectives, or click any video to watch the full demo with instructions.
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