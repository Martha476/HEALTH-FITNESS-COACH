"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import TopNavBar from "../components/TopNavBar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWeightScale, faFire, faRunning,
  faBullseye, faRocket,
} from "@fortawesome/free-solid-svg-icons";

// ─── Sync helpers ─────────────────────────────────────────────────────────────
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
function readObject<T extends object>(userId: string, key: string): T {
  try {
    const scoped = localStorage.getItem(scopedKey(userId, key));
    if (scoped) return JSON.parse(scoped) as T;
    const global = localStorage.getItem(key);
    if (global)  return JSON.parse(global)  as T;
  } catch {}
  return {} as T;
}
function writeData<T>(userId: string, key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(scopedKey(userId, key), json);
    localStorage.setItem(key, json);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: json }));
  } catch {}
}

const KEYS = {
  workoutHistory: "workoutHistory",
  weightHistory:  "weightHistory",
  strengthLog:    "strengthLog",
  userProfile:    "userProfile",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeightEntry   { date: string; weight: number; unit: string; }
interface WorkoutEntry  { id: string; name: string; date: string; duration: number; exercises: number; }
interface StrengthEntry { exercise: string; weight: number; unit: string; date: string; }
interface UserProfile   { currentWeight?: number; targetWeight?: number; preferredUnit?: string; }

interface ProgressStats {
  currentWeight:  number;
  startWeight:    number;
  targetWeight:   number;
  weightUnit:     string;   // ✅ FIX 1: single source of truth for unit
  totalWorkouts:  number;
  currentStreak:  number;
  weeklyCalories: number;
  weightHistory:  WeightEntry[];
  strengthLog:    StrengthEntry[];
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────
// ✅ FIX 1: Convert any weight value to the profile's preferred unit
function normaliseWeight(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === "kg" && toUnit === "lbs") return parseFloat((value * 2.20462).toFixed(1));
  if (fromUnit === "lbs" && toUnit === "kg") return parseFloat((value / 2.20462).toFixed(1));
  return value;
}

// ════════════════════════════════════════════════════════════════════════════
// Progress Page
// ════════════════════════════════════════════════════════════════════════════
export default function Progress() {
  const { user } = useAuth();

  const [stats,             setStats]             = useState<ProgressStats | null>(null);
  const [workoutHistory,    setWorkoutHistory]    = useState<WorkoutEntry[]>([]);
  const [showWeightModal,   setShowWeightModal]   = useState(false);
  const [newWeight,         setNewWeight]         = useState("");
  const [newWeightUnit,     setNewWeightUnit]     = useState("lbs");
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [newStrength,       setNewStrength]       = useState({ exercise: "", weight: "", unit: "lbs" });
  const [savedMessage,      setSavedMessage]      = useState("");

  const loadUserData = useCallback(() => {
    if (!user) return;

    const profile       = readObject<UserProfile>(user.id, KEYS.userProfile);
    const weightHistory = readList<WeightEntry>(user.id, KEYS.weightHistory);
    const workouts      = readList<WorkoutEntry>(user.id, KEYS.workoutHistory);
    const strength      = readList<StrengthEntry>(user.id, KEYS.strengthLog);

    setWorkoutHistory(workouts);

    // ✅ FIX 1: Derive ONE canonical unit from profile — used everywhere
    const profileUnit: string =
      profile.preferredUnit === "metric" ? "kg" : "lbs";

    // ✅ FIX 1: Normalise ALL weight history entries to profileUnit
    const normalisedHistory: WeightEntry[] = weightHistory.map((e) => ({
      ...e,
      weight: normaliseWeight(e.weight, e.unit, profileUnit),
      unit:   profileUnit,
    }));

    const latestWeight =
      normalisedHistory.length > 0
        ? normalisedHistory[normalisedHistory.length - 1].weight
        : profile.currentWeight
        ? normaliseWeight(profile.currentWeight, "lbs", profileUnit)
        : 0;

    const startWeight =
      profile.currentWeight
        ? normaliseWeight(profile.currentWeight, "lbs", profileUnit)
        : 0;

    const targetWeight =
      profile.targetWeight
        ? normaliseWeight(profile.targetWeight, "lbs", profileUnit)
        : 0;

    // ✅ FIX 2: Guard against 0-duration workouts — show "< 1 min" instead of 0
    const oneWeekAgo     = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyCalories = workouts
      .filter((w) => new Date(w.date) >= oneWeekAgo)
      .length * 350;

    setStats({
      currentWeight:  latestWeight,
      startWeight,
      targetWeight,
      weightUnit:     profileUnit,   // ✅ FIX 1: single unit
      totalWorkouts:  workouts.length,
      currentStreak:  calculateStreak(workouts),
      weeklyCalories,
      weightHistory:  normalisedHistory,
      strengthLog:    strength,
    });

    setNewWeightUnit(profileUnit);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadUserData();
  }, [user?.id, loadUserData]);

  useEffect(() => {
    const handle = (e: StorageEvent) => {
      const watched = [KEYS.workoutHistory, KEYS.weightHistory, KEYS.strengthLog, KEYS.userProfile];
      if (e.key && watched.includes(e.key as any)) loadUserData();
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [loadUserData]);

  const calculateStreak = (workouts: WorkoutEntry[]): number => {
    if (!workouts.length) return 0;
    const sorted = [...workouts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let streak = 0;
    let check  = new Date();
    check.setHours(0, 0, 0, 0);
    for (const w of sorted) {
      const wd = new Date(w.date);
      wd.setHours(0, 0, 0, 0);
      const diff = Math.round((check.getTime() - wd.getTime()) / 86400000);
      if (diff <= 1) { streak++; check = wd; } else break;
    }
    return streak;
  };

  const saveWeight = () => {
    if (!newWeight || !user) return;
    const entry: WeightEntry = {
      date:   new Date().toISOString(),
      weight: parseFloat(newWeight),
      unit:   newWeightUnit,   // save with the selected unit
    };
    const history = readList<WeightEntry>(user.id, KEYS.weightHistory);
    writeData(user.id, KEYS.weightHistory, [...history, entry]);
    setNewWeight("");
    setShowWeightModal(false);
    setSavedMessage("Weight logged!");
    setTimeout(() => setSavedMessage(""), 2500);
    loadUserData();
  };

  const saveStrength = () => {
    if (!newStrength.exercise || !newStrength.weight || !user) return;
    const entry: StrengthEntry = {
      exercise: newStrength.exercise,
      weight:   parseFloat(newStrength.weight),
      unit:     newStrength.unit,
      date:     new Date().toISOString(),
    };
    const log = readList<StrengthEntry>(user.id, KEYS.strengthLog);
    writeData(user.id, KEYS.strengthLog, [...log, entry]);
    setNewStrength({ exercise: "", weight: "", unit: "lbs" });
    setShowStrengthModal(false);
    setSavedMessage("Strength entry saved!");
    setTimeout(() => setSavedMessage(""), 2500);
    loadUserData();
  };

  // ✅ FIX 3: Correct progress calculation
  // For weight LOSS: start > target, progress = how much lost / total to lose
  // For weight GAIN: start < target, progress = how much gained / total to gain
  const weightProgress = (): number => {
    if (!stats) return 0;
    const { startWeight, currentWeight, targetWeight } = stats;
    if (!startWeight || !targetWeight || startWeight === targetWeight) return 0;

    const totalChange   = Math.abs(targetWeight - startWeight);
    const currentChange = Math.abs(currentWeight - startWeight);

    // ✅ FIX 3: Only count progress in the RIGHT direction
    const isLosingWeight  = targetWeight < startWeight;
    const isGainingWeight = targetWeight > startWeight;
    const movingCorrectly =
      (isLosingWeight  && currentWeight <= startWeight) ||
      (isGainingWeight && currentWeight >= startWeight);

    if (!movingCorrectly) return 0;
    return Math.min(100, Math.round((currentChange / totalChange) * 100));
  };

  const getWeekGrid = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const worked = workoutHistory.some((w) => {
        const wd = new Date(w.date);
        wd.setHours(0, 0, 0, 0);
        return wd.getTime() === d.getTime();
      });
      days.push({
        label:  d.toLocaleDateString("en-US", { weekday: "short" }),
        worked,
      });
    }
    return days;
  };

  const getBestLifts = () => {
    if (!stats?.strengthLog.length) return [];
    const bests: Record<string, StrengthEntry> = {};
    stats.strengthLog.forEach((e) => {
      if (!bests[e.exercise] || e.weight > bests[e.exercise].weight)
        bests[e.exercise] = e;
    });
    return Object.values(bests).slice(0, 5);
  };

  const hasData =
    stats &&
    (stats.totalWorkouts > 0 ||
      stats.weightHistory.length > 0 ||
      stats.strengthLog.length > 0);

  const inputCls =
    "w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg " +
    "text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 " +
    "focus:ring-green-500 text-sm";

  // ✅ FIX 2: Display duration — show "< 1 min" if 0
  const formatDuration = (mins: number): string =>
    mins > 0 ? `${mins} min` : "< 1 min";

  return (
    <>
      <TopNavBar />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Progress Tracking
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {user?.name ? `${user.name}'s fitness journey` : "Your fitness journey"}
            <span className="ml-2 text-xs text-green-400">• Updates automatically</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWeightModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            + Weight
          </button>
          <button
            onClick={() => setShowStrengthModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            + Strength
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="mb-4 bg-green-900/40 border border-green-500/40 rounded-xl px-4 py-2.5 text-green-300 text-sm">
          ✓ {savedMessage}
        </div>
      )}

      {/* Hero */}
      <div className="mb-5 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
        <div className="relative w-full h-44 sm:h-52">
          <img
            src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80"
            alt="Fitness progress"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-0.5">
              Track Your Journey
            </h2>
            <p className="text-green-300 font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
  Every entry brings you closer to your goal
</p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="mb-5 bg-cyan-900/20 border border-cyan-700/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl text-cyan-400">
              <FontAwesomeIcon icon={faRocket} />
            </span>
            <div>
              <h3 className="text-base font-bold text-cyan-400 mb-1">
                Start Tracking Today!
              </h3>
              <p className="text-slate-300 text-sm mb-3">
                Log your weight, complete a workout, or record a lift — this page
                updates automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowWeightModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  Log Weight →
                </button>
                <Link
                  href="/workouts"
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  Start Workout →
                </Link>
                <Link
                  href="/ai-coach"
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  Talk to AI Coach →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {
            icon:  faWeightScale,
            label: "Current Weight",
            // ✅ FIX 1: always uses stats.weightUnit (single unit)
            value: stats?.currentWeight
              ? `${stats.currentWeight} ${stats.weightUnit}`
              : "--",
            sub:   stats?.targetWeight
              ? `Target: ${stats.targetWeight} ${stats.weightUnit}`
              : "Set in profile",
            color: "text-blue-400",
          },
          {
            icon:  faFire,
            label: "Total Workouts",
            value: stats?.totalWorkouts ?? "--",
            sub:
              workoutHistory.filter((w) => {
                const d = new Date(w.date), n = new Date();
                return (
                  d.getMonth() === n.getMonth() &&
                  d.getFullYear() === n.getFullYear()
                );
              }).length + " this month",
            color: "text-orange-400",
          },
          {
            icon:  faRunning,
            label: "Weekly Calories",
            value: stats?.weeklyCalories ? `~${stats.weeklyCalories}` : "--",
            sub:   "kcal burned est.",
            color: "text-yellow-400",
          },
          {
            icon:  faBullseye,
            label: "Workout Streak",
            value: stats?.currentStreak ?? "--",
            sub:   "consecutive days",
            color: "text-green-400",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-xs font-medium">{card.label}</p>
              <span className={`text-2xl ${card.color}`}>
                <FontAwesomeIcon icon={card.icon} />
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-slate-500 text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ✅ FIX 3: Weight goal progress — recalculates correctly */}
      {stats && stats.targetWeight > 0 && stats.currentWeight > 0 && (
        <div className="mb-5 bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-100">
              Weight Goal Progress
            </h3>
            <span className="text-sm font-bold text-green-400">
              {weightProgress()}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${weightProgress()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            {/* ✅ FIX 1: all 3 values now use the same weightUnit */}
            <span>Start: {stats.startWeight} {stats.weightUnit}</span>
            <span>Now: {stats.currentWeight} {stats.weightUnit}</span>
            <span>Goal: {stats.targetWeight} {stats.weightUnit}</span>
          </div>
          {/* ✅ FIX 3: helpful message when progress is 0 */}
          {weightProgress() === 0 && stats.currentWeight === stats.startWeight && (
            <p className="text-xs text-slate-500 mt-2">
              Log a new weight entry to start tracking your progress 📝
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Weight History */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-100">Weight History</h2>
            <button
              onClick={() => setShowWeightModal(true)}
              className="text-xs text-green-400 hover:text-green-300 font-medium"
            >
              + Log Weight
            </button>
          </div>
          {stats?.weightHistory.length ? (
            <>
              <div className="flex items-end gap-1 h-28 mb-3">
                {stats.weightHistory.slice(-10).map((e, i) => {
                  const weights = stats.weightHistory.slice(-10).map((w) => w.weight);
                  const min    = Math.min(...weights);
                  const max    = Math.max(...weights);
                  const height = Math.max(10, ((e.weight - min) / (max - min || 1)) * 90 + 10);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500 rounded-t opacity-80"
                        style={{ height: `${height}%` }}
                        // ✅ FIX 1: tooltip uses same unit
                        title={`${e.weight} ${stats.weightUnit}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {[...stats.weightHistory].reverse().slice(0, 5).map((e, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1.5 px-2 bg-slate-700/50 rounded-lg"
                  >
                    <span className="text-xs text-slate-400">
                      {new Date(e.date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                    {/* ✅ FIX 1: always shows normalised unit */}
                    <span className="text-sm font-bold text-blue-400">
                      {e.weight} {stats.weightUnit}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No weight entries yet</p>
              <button
                onClick={() => setShowWeightModal(true)}
                className="mt-2 text-xs text-green-400 underline"
              >
                Log your first weight
              </button>
            </div>
          )}
        </div>

        {/* Workout History */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-100">Recent Workouts</h2>
            <Link
              href="/workouts"
              className="text-xs text-green-400 hover:text-green-300 font-medium"
            >
              + New Workout
            </Link>
          </div>
          {workoutHistory.length ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...workoutHistory].reverse().slice(0, 6).map((w) => (
                <div
                  key={w.id}
                  className="flex justify-between items-center py-2 px-3 bg-slate-700/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{w.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(w.date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}{" "}
                      &bull;{" "}
                      {/* ✅ FIX 2: show "< 1 min" instead of "0 min" */}
                      {formatDuration(w.duration)}{" "}
                      &bull; {w.exercises} exercises
                    </p>
                  </div>
                  <span className="text-green-400 text-lg">✓</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No workouts recorded yet</p>
              <Link
                href="/workouts"
                className="mt-2 text-xs text-green-400 underline block"
              >
                Start your first workout
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Best Lifts */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-100">Best Lifts</h2>
            <button
              onClick={() => setShowStrengthModal(true)}
              className="text-xs text-green-400 hover:text-green-300 font-medium"
            >
              + Log Lift
            </button>
          </div>
          {getBestLifts().length ? (
            <div className="space-y-2">
              {getBestLifts().map((e, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 px-3 bg-slate-700/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{e.exercise}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(e.date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-base font-bold text-green-400">
                    {e.weight} {e.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No strength entries yet</p>
              <button
                onClick={() => setShowStrengthModal(true)}
                className="mt-2 text-xs text-green-400 underline"
              >
                Log your first lift
              </button>
            </div>
          )}
        </div>

        {/* Weekly Consistency */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h2 className="text-base font-bold text-slate-100 mb-4">
            This Week&apos;s Consistency
          </h2>
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {getWeekGrid().map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-slate-400 mb-1.5">{day.label}</p>
                <div
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
                    day.worked
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-slate-500"
                  }`}
                >
                  {day.worked ? "✓" : "·"}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              {
                label: "This Month",
                value:
                  workoutHistory.filter((w) => {
                    const d = new Date(w.date), n = new Date();
                    return (
                      d.getMonth() === n.getMonth() &&
                      d.getFullYear() === n.getFullYear()
                    );
                  }).length + " workouts",
                color: "text-green-400",
              },
              {
                label: "This Week",
                value: getWeekGrid().filter((d) => d.worked).length + "/7 days",
                color: "text-blue-400",
              },
              {
                label: "Streak",
                value: (stats?.currentStreak ?? 0) + " days",
                color: "text-orange-400",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-700/50 rounded-xl p-3 text-center"
              >
                <p className="text-slate-400 text-xs mb-1">{item.label}</p>
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Log Weight</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Weight</label>
                <input
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="e.g. 75"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                <select
                  value={newWeightUnit}
                  onChange={(e) => setNewWeightUnit(e.target.value)}
                  className={inputCls}
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <p className="text-xs text-slate-400">
                Today:{" "}
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </p>
              {/* ✅ FIX 1: Warn if user picks different unit than profile */}
              {newWeightUnit !== stats?.weightUnit && stats?.weightUnit && (
                <p className="text-xs text-amber-400 bg-amber-900/20 px-3 py-2 rounded-lg">
                  ⚠ Your profile uses <strong>{stats.weightUnit}</strong>. This entry will be
                  automatically converted.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowWeightModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveWeight}
                disabled={!newWeight}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Save Weight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strength Modal */}
      {showStrengthModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Log Strength</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Exercise</label>
                <input
                  type="text"
                  value={newStrength.exercise}
                  onChange={(e) => setNewStrength((p) => ({ ...p, exercise: e.target.value }))}
                  placeholder="e.g. Bench Press"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Weight</label>
                  <input
                    type="number"
                    value={newStrength.weight}
                    onChange={(e) => setNewStrength((p) => ({ ...p, weight: e.target.value }))}
                    placeholder="e.g. 80"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={newStrength.unit}
                    onChange={(e) => setNewStrength((p) => ({ ...p, unit: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Logged for today:{" "}
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowStrengthModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveStrength}
                disabled={!newStrength.exercise || !newStrength.weight}
                className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Save Lift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}