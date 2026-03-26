"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

// ─── Sync helpers (inlined) ───────────────────────────────────────────────────
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
  mealHistory:  "mealHistory",
  userProfile:  "userProfile",
  waterIntake:  "waterIntake",
  waterDate:    "waterIntakeDate",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Meal      { name: string; calories: number; protein: number; carbs: number; fats: number; }
interface SavedMeal extends Meal { id: string; date: string; time: string; }
interface UserProfile { primaryGoal?: string; dailyCalorieGoal?: number; }
interface MealSuggestion extends Meal { description: string; }

// ═════════════════════════════════════════════════════════════════════════════
// Nutrition Page
// ═════════════════════════════════════════════════════════════════════════════
export default function Nutrition() {
  const router       = useRouter();
  const { user }     = useAuth();

  const [meals,        setMeals]        = useState<Meal[]>([]);
  const [mealHistory,  setMealHistory]  = useState<SavedMeal[]>([]);
  const [activeTab,    setActiveTab]    = useState("today");
  const [mealName,     setMealName]     = useState("");
  const [calories,     setCalories]     = useState("");
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;

    const history = readList<SavedMeal>(user.id, KEYS.mealHistory);
    setMealHistory(history);

    const savedWater = localStorage.getItem(KEYS.waterIntake);
    const savedDate  = localStorage.getItem(KEYS.waterDate);
    const today      = new Date().toDateString();
    setWaterGlasses(savedWater && savedDate === today ? parseInt(savedWater) : 0);
    if (!savedDate || savedDate !== today) {
      localStorage.setItem(KEYS.waterIntake, "0");
      localStorage.setItem(KEYS.waterDate, today);
    }

    const profile = readObject<UserProfile>(user.id, KEYS.userProfile);
    setUserProfile(Object.keys(profile).length > 0 ? profile : null);
  }, [user?.id]);

  // Listen for profile updates
  useEffect(() => {
    const handle = (e: StorageEvent) => {
      if (e.key === KEYS.userProfile && user) {
        const profile = readObject<UserProfile>(user.id, KEYS.userProfile);
        setUserProfile(Object.keys(profile).length > 0 ? profile : null);
      }
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [user?.id]);

  const saveMealToHistory = (meal: Meal) => {
    if (!user) return;
    const saved: SavedMeal = {
      ...meal,
      id:   Date.now().toString(),
      date: new Date().toISOString(),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [saved, ...mealHistory];
    setMealHistory(updated);
    writeData(user.id, KEYS.mealHistory, updated);
  };

  const addWaterGlass = () => {
    if (waterGlasses >= 12) return;
    const n = waterGlasses + 1;
    setWaterGlasses(n);
    localStorage.setItem(KEYS.waterIntake, n.toString());
    localStorage.setItem(KEYS.waterDate, new Date().toDateString());
    window.dispatchEvent(new StorageEvent("storage", { key: KEYS.waterIntake, newValue: n.toString() }));
  };

  const resetWater = () => {
    setWaterGlasses(0);
    localStorage.setItem(KEYS.waterIntake, "0");
    localStorage.setItem(KEYS.waterDate, new Date().toDateString());
  };

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein  = meals.reduce((s, m) => s + m.protein,  0);
  const totalCarbs    = meals.reduce((s, m) => s + m.carbs,    0);
  const totalFats     = meals.reduce((s, m) => s + m.fats,     0);

  const dailyGoals = {
    calories: userProfile?.dailyCalorieGoal || 2000,
    protein:  Math.round((userProfile?.dailyCalorieGoal || 2000) * 0.3 / 4),
    carbs:    Math.round((userProfile?.dailyCalorieGoal || 2000) * 0.4 / 4),
    fats:     Math.round((userProfile?.dailyCalorieGoal || 2000) * 0.3 / 9),
  };

  const getMealSuggestions = (): MealSuggestion[] => {
    const goal = userProfile?.primaryGoal || "maintain";
    const s: Record<string, MealSuggestion[]> = {
      "lose-weight": [
        { name: "Lean Protein Bowl",       description: "Grilled chicken, quinoa, broccoli",        calories: 380, protein: 42, carbs: 35, fats: 8  },
        { name: "Greek Salad with Salmon", description: "Grilled salmon, greens, cucumber, feta",   calories: 420, protein: 38, carbs: 22, fats: 18 },
        { name: "Veggie Omelette",         description: "3 egg whites, spinach, mushrooms, toast",  calories: 320, protein: 28, carbs: 30, fats: 10 },
        { name: "Turkey & Avocado Wrap",   description: "Turkey, avocado, lettuce, whole wheat",    calories: 360, protein: 32, carbs: 35, fats: 12 },
      ],
      "build-muscle": [
        { name: "High-Protein Breakfast",  description: "4 eggs, oatmeal, toast with peanut butter", calories: 680, protein: 42, carbs: 65, fats: 24 },
        { name: "Steak & Sweet Potato",    description: "8oz sirloin, sweet potato, green beans",    calories: 720, protein: 58, carbs: 62, fats: 22 },
        { name: "Chicken & Rice Bowl",     description: "Grilled chicken, brown rice, avocado",      calories: 650, protein: 52, carbs: 68, fats: 18 },
        { name: "Salmon & Quinoa Plate",   description: "Baked salmon, quinoa, roasted vegetables",  calories: 620, protein: 48, carbs: 55, fats: 20 },
      ],
      maintain: [
        { name: "Balanced Chicken Bowl",   description: "Grilled chicken, brown rice, vegetables",  calories: 520, protein: 38, carbs: 52, fats: 15 },
        { name: "Mediterranean Plate",     description: "Grilled fish, couscous, roasted veg",      calories: 480, protein: 35, carbs: 48, fats: 16 },
        { name: "Protein Smoothie Bowl",   description: "Protein shake, banana, berries, granola",  calories: 450, protein: 32, carbs: 50, fats: 14 },
        { name: "Pasta with Lean Meat",    description: "Whole wheat pasta, lean turkey, marinara", calories: 510, protein: 36, carbs: 58, fats: 13 },
      ],
    };
    return s[goal] || s["maintain"];
  };

  const waterPct = Math.min((waterGlasses / 8) * 100, 100);

  const inputCls = "w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-14 py-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100">🥗 Nutrition Planner</h1>
        <p className="text-slate-400 mt-2 text-base">
          Track your meals — syncs to Dashboard and Progress automatically
        </p>
      </div>

      {/* Hero */}
      <div className="mb-6 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-hidden flex justify-center">
          <img src="/images/download (1).jpg" alt="Healthy meal"
            className="w-full max-w-2xl h-72 md:h-96 object-cover transition-transform duration-300 hover:scale-105 shadow-lg" />
        </div>
        <div className="bg-slate-800 p-4">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Fuel Your Body Right 🥙</h2>
          <p className="text-slate-300 text-sm mb-3">Plan balanced meals, track macros, achieve your goals</p>
          <button onClick={() => setActiveTab("suggestions")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm">
            Explore 🔍
          </button>
        </div>
      </div>

      {/* Profile prompt */}
      {(!userProfile || !userProfile.dailyCalorieGoal) && (
        <div className="mb-6 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-l-4 border-amber-500 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <div className="text-xl">📊</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-300 mb-1">Set Your Daily Nutrition Goals</h3>
              <p className="text-xs text-slate-300 mb-2">Complete your profile to get personalized calorie and macro targets.</p>
              <button onClick={() => router.push("/profile")}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                Complete Profile →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Water */}
      <div className="mb-6 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl shadow-lg p-5 border border-blue-700/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-2">
              <span>💧</span> Water Intake
            </h2>
            <div className="flex gap-3 mb-4">
              <button onClick={addWaterGlass} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg font-semibold transition-all flex items-center gap-2">
                <span>💧</span> Log Glass
              </button>
              <button onClick={resetWater} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 text-sm rounded-lg font-semibold transition-all">
                Reset
              </button>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-slate-300 font-semibold text-sm">Today&apos;s Progress</span>
                <span className="text-blue-400 font-bold text-sm">{waterGlasses} / 8 glasses</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-3">
                <div className="h-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${waterPct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">Target: 2L (8 glasses) per day</p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-48 h-64 rounded-2xl overflow-hidden shadow-xl">
              <img src="https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&auto=format&fit=crop&q=80"
                alt="Water" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-2xl font-bold text-white drop-shadow-lg">💧 Water</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Calories", value: totalCalories, goal: dailyGoals.calories, unit: "kcal", color: "amber"  },
          { label: "Protein",  value: totalProtein,  goal: dailyGoals.protein,  unit: "g",    color: "red"    },
          { label: "Carbs",    value: totalCarbs,    goal: dailyGoals.carbs,    unit: "g",    color: "blue"   },
          { label: "Fats",     value: totalFats,     goal: dailyGoals.fats,     unit: "g",    color: "yellow" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700">
            <div className="text-center">
              <p className="text-slate-400 text-xs font-medium">{stat.label}</p>
              <p className={`text-3xl font-bold text-${stat.color}-500 mt-1`}>{stat.value}{stat.unit !== "kcal" ? stat.unit : ""}</p>
              <p className="text-slate-400 text-xs mt-1">/ {stat.goal} {stat.unit}</p>
              <div className="mt-2 w-full h-2 bg-slate-600 rounded-full">
                <div className={`h-2 bg-${stat.color}-500 rounded-full`} style={{ width: `${Math.min((stat.value / stat.goal) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6 border-b border-slate-700">
        {["today", "suggestions", "history"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 font-semibold text-sm ${activeTab === tab ? "text-green-400 border-b-2 border-green-400" : "text-slate-400 hover:text-slate-200"}`}>
            {tab === "today"       && "Today's Meals"}
            {tab === "suggestions" && "AI Suggestions"}
            {tab === "history"     && `History (${mealHistory.length})`}
          </button>
        ))}
      </div>

      {/* Today */}
      {activeTab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
            <div className="p-5 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100">Today&apos;s Meals</h2>
            </div>
            {meals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🍽️</div>
                <p className="text-slate-400 text-base">No meals logged today</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {meals.map((meal, idx) => (
                  <div key={idx} className="p-4 px-5 flex items-center justify-between hover:bg-slate-700/50">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-100 text-sm">{meal.name}</p>
                      <p className="text-xs text-slate-400">P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600 text-sm">{meal.calories} kcal</p>
                      <button onClick={() => setMeals(meals.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:text-red-700">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 mb-3">🍽️ Log Meal</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Meal name" value={mealName} onChange={(e) => setMealName(e.target.value)} className={inputCls} />
              <input type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputCls} />
              <button
                onClick={() => {
                  if (mealName && calories) {
                    const m: Meal = {
                      name: mealName, calories: parseInt(calories),
                      protein: Math.round(parseInt(calories) * 0.3 / 4),
                      carbs:   Math.round(parseInt(calories) * 0.4 / 4),
                      fats:    Math.round(parseInt(calories) * 0.3 / 9),
                    };
                    setMeals([...meals, m]);
                    saveMealToHistory(m);
                    setMealName(""); setCalories("");
                  } else alert("Please enter meal name and calories");
                }}
                className="w-full bg-green-600 text-white py-2 text-sm rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Log Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {activeTab === "suggestions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {getMealSuggestions().map((s, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700">
              <h3 className="font-bold text-base text-slate-100 mb-2">{s.name}</h3>
              <p className="text-slate-400 text-xs mb-3">{s.description}</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                {[
                  { val: s.calories, label: "kcal",    color: "text-orange-500" },
                  { val: s.protein,  label: "protein", color: "text-red-500"    },
                  { val: s.carbs,    label: "carbs",   color: "text-blue-500"   },
                  { val: s.fats,     label: "fats",    color: "text-yellow-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className={`${item.color} font-bold text-sm`}>{item.val}{item.label !== "kcal" ? "g" : ""}</p>
                    <p className="text-slate-400 text-xs">{item.label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const m: Meal = { name: s.name, calories: s.calories, protein: s.protein, carbs: s.carbs, fats: s.fats };
                  setMeals([...meals, m]);
                  saveMealToHistory(m);
                  setActiveTab("today");
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
                Add to Today
              </button>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
          <div className="p-5 border-b border-slate-700">
            <h2 className="text-xl font-bold text-slate-100">Meal History</h2>
          </div>
          {mealHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 text-base mb-2">No meal history yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {mealHistory.map((meal) => (
                <div key={meal.id} className="p-4 px-5 flex items-center justify-between hover:bg-slate-700/50">
                  <div>
                    <p className="font-semibold text-slate-100 text-sm">{meal.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(meal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {meal.time} • {meal.calories} kcal
                    </p>
                    <p className="text-xs text-slate-500">P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g</p>
                  </div>
                  <button
                    onClick={() => {
                      const m: Meal = { name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fats: meal.fats };
                      setMeals([...meals, m]);
                      setActiveTab("today");
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors text-xs">
                    Add Again
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