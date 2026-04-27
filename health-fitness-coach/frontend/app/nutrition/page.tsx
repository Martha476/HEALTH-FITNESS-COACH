"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
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

// ─── OpenFoodFacts search ─────────────────────────────────────────────────────
async function searchFood(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,serving_size,quantity`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.products?.length) return [];

    return data.products
      .filter((p: any) => p.product_name && p.nutriments?.["energy-kcal_100g"])
      .slice(0, 5)
      .map((p: any) => {
        const n   = p.nutriments;
        const per = 100;
        return {
          food_name:  p.product_name,
          calories:   Math.round(n["energy-kcal_100g"] || 0),
          protein_g:  Math.round((n["proteins_100g"]     || 0) * 10) / 10,
          carbs_g:    Math.round((n["carbohydrates_100g"]|| 0) * 10) / 10,
          fat_g:      Math.round((n["fat_100g"]          || 0) * 10) / 10,
          serving:    p.serving_size || `per ${per}g`,
          confidence: "exact" as const,
        };
      });
  } catch {
    return [];
  }
}

// ─── Common foods fallback (instant, no API) ──────────────────────────────────
const COMMON: Record<string, FoodResult> = {
  "banana":          { food_name: "Banana (medium)",        calories: 89,  protein_g: 1.1,  carbs_g: 23,  fat_g: 0.3,  serving: "118g",  confidence: "exact" },
  "egg":             { food_name: "Boiled Egg (large)",      calories: 78,  protein_g: 6.3,  carbs_g: 0.6, fat_g: 5.3,  serving: "50g",   confidence: "exact" },
  "eggs":            { food_name: "Boiled Egg (large)",      calories: 78,  protein_g: 6.3,  carbs_g: 0.6, fat_g: 5.3,  serving: "50g",   confidence: "exact" },
  "rice":            { food_name: "White Rice (cooked)",     calories: 130, protein_g: 2.7,  carbs_g: 28,  fat_g: 0.3,  serving: "100g",  confidence: "exact" },
  "brown rice":      { food_name: "Brown Rice (cooked)",     calories: 112, protein_g: 2.6,  carbs_g: 24,  fat_g: 0.9,  serving: "100g",  confidence: "exact" },
  "chicken breast":  { food_name: "Chicken Breast (grilled)",calories: 165, protein_g: 31,   carbs_g: 0,   fat_g: 3.6,  serving: "100g",  confidence: "exact" },
  "chicken":         { food_name: "Chicken Breast (grilled)",calories: 165, protein_g: 31,   carbs_g: 0,   fat_g: 3.6,  serving: "100g",  confidence: "exact" },
  "oatmeal":         { food_name: "Oatmeal (cooked)",        calories: 71,  protein_g: 2.5,  carbs_g: 12,  fat_g: 1.5,  serving: "100g",  confidence: "exact" },
  "oats":            { food_name: "Rolled Oats (dry)",       calories: 389, protein_g: 17,   carbs_g: 66,  fat_g: 7,    serving: "100g",  confidence: "exact" },
  "bread":           { food_name: "Whole Wheat Bread",       calories: 247, protein_g: 13,   carbs_g: 41,  fat_g: 3.4,  serving: "100g",  confidence: "exact" },
  "toast":           { food_name: "Whole Wheat Toast (1 slice)", calories: 74, protein_g: 4, carbs_g: 12, fat_g: 1,    serving: "30g",   confidence: "exact" },
  "milk":            { food_name: "Whole Milk",              calories: 61,  protein_g: 3.2,  carbs_g: 4.8, fat_g: 3.3,  serving: "100ml", confidence: "exact" },
  "salmon":          { food_name: "Salmon (grilled)",        calories: 208, protein_g: 20,   carbs_g: 0,   fat_g: 13,   serving: "100g",  confidence: "exact" },
  "tuna":            { food_name: "Tuna (canned in water)",  calories: 116, protein_g: 26,   carbs_g: 0,   fat_g: 1,    serving: "100g",  confidence: "exact" },
  "apple":           { food_name: "Apple (medium)",          calories: 52,  protein_g: 0.3,  carbs_g: 14,  fat_g: 0.2,  serving: "182g",  confidence: "exact" },
  "avocado":         { food_name: "Avocado (half)",          calories: 160, protein_g: 2,    carbs_g: 9,   fat_g: 15,   serving: "100g",  confidence: "exact" },
  "sweet potato":    { food_name: "Sweet Potato (baked)",    calories: 103, protein_g: 2.3,  carbs_g: 24,  fat_g: 0.1,  serving: "150g",  confidence: "exact" },
  "broccoli":        { food_name: "Broccoli (steamed)",      calories: 35,  protein_g: 2.4,  carbs_g: 7,   fat_g: 0.4,  serving: "100g",  confidence: "exact" },
  "pasta":           { food_name: "Pasta (cooked)",          calories: 158, protein_g: 5.8,  carbs_g: 31,  fat_g: 0.9,  serving: "100g",  confidence: "exact" },
  "yogurt":          { food_name: "Greek Yogurt (plain)",    calories: 59,  protein_g: 10,   carbs_g: 3.6, fat_g: 0.4,  serving: "100g",  confidence: "exact" },
  "peanut butter":   { food_name: "Peanut Butter",           calories: 588, protein_g: 25,   carbs_g: 20,  fat_g: 50,   serving: "100g",  confidence: "exact" },
  "almonds":         { food_name: "Almonds",                 calories: 579, protein_g: 21,   carbs_g: 22,  fat_g: 50,   serving: "100g",  confidence: "exact" },
  "beef":            { food_name: "Beef (lean, cooked)",     calories: 217, protein_g: 26,   carbs_g: 0,   fat_g: 12,   serving: "100g",  confidence: "exact" },
  "steak":           { food_name: "Beef Steak (grilled)",    calories: 271, protein_g: 26,   carbs_g: 0,   fat_g: 18,   serving: "100g",  confidence: "exact" },
  "quinoa":          { food_name: "Quinoa (cooked)",         calories: 120, protein_g: 4.4,  carbs_g: 22,  fat_g: 1.9,  serving: "100g",  confidence: "exact" },
  "lentils":         { food_name: "Lentils (cooked)",        calories: 116, protein_g: 9,    carbs_g: 20,  fat_g: 0.4,  serving: "100g",  confidence: "exact" },
  "orange":          { food_name: "Orange (medium)",         calories: 62,  protein_g: 1.2,  carbs_g: 15,  fat_g: 0.2,  serving: "131g",  confidence: "exact" },
  "strawberries":    { food_name: "Strawberries",            calories: 32,  protein_g: 0.7,  carbs_g: 7.7, fat_g: 0.3,  serving: "100g",  confidence: "exact" },
  "spinach":         { food_name: "Spinach (raw)",           calories: 23,  protein_g: 2.9,  carbs_g: 3.6, fat_g: 0.4,  serving: "100g",  confidence: "exact" },
  "cheese":          { food_name: "Cheddar Cheese",          calories: 402, protein_g: 25,   carbs_g: 1.3, fat_g: 33,   serving: "100g",  confidence: "exact" },
  "pizza":           { food_name: "Pizza (cheese, 1 slice)", calories: 272, protein_g: 12,   carbs_g: 34,  fat_g: 10,   serving: "107g",  confidence: "estimated" },
  "burger":          { food_name: "Beef Burger",             calories: 354, protein_g: 20,   carbs_g: 29,  fat_g: 17,   serving: "150g",  confidence: "estimated" },
  "coffee":          { food_name: "Black Coffee",            calories: 2,   protein_g: 0.3,  carbs_g: 0,   fat_g: 0,    serving: "240ml", confidence: "exact" },
  "protein shake":   { food_name: "Protein Shake (whey)",    calories: 120, protein_g: 25,   carbs_g: 5,   fat_g: 2,    serving: "1 scoop", confidence: "estimated" },
};

function lookupCommon(query: string): FoodResult | null {
  const q = query.toLowerCase().trim();
  if (COMMON[q]) return COMMON[q];
  for (const key of Object.keys(COMMON)) {
    if (q.includes(key) || key.includes(q)) return COMMON[key];
  }
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Meal      { name: string; calories: number; protein: number; carbs: number; fats: number; }
interface SavedMeal extends Meal { id: string; date: string; time: string; }
interface UserProfile { primaryGoal?: string; dailyCalorieGoal?: number; }
interface MealSuggestion extends Meal { description: string; }
interface FoodResult {
  food_name:  string;
  calories:   number;
  protein_g:  number;
  carbs_g:    number;
  fat_g:      number;
  serving:    string;
  confidence: "exact" | "estimated";
}

interface AIAnalysisResult {
  food_name: string;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size_grams: number;
  description: string;
  portion_estimate: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// Nutrition Page
// ═════════════════════════════════════════════════════════════════════════════
export default function Nutrition() {
  const router       = useRouter();
  const { user }     = useAuth();

  const [meals,        setMeals]        = useState<Meal[]>([]);
  const [mealHistory,  setMealHistory]  = useState<SavedMeal[]>([]);
  const [activeTab,    setActiveTab]    = useState("today");
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Food search state
  const [query,         setQuery]         = useState("");
  const [searching,     setSearching]     = useState(false);
  const [results,       setResults]       = useState<FoodResult[]>([]);
  const [selected,      setSelected]      = useState<FoodResult | null>(null);
  const [servings,      setServings]      = useState(1);
  const [mealType,      setMealType]      = useState("lunch");
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [logging,       setLogging]       = useState(false);
  const [logSuccess,    setLogSuccess]    = useState(false);

  // Photo analysis state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Load data
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

    // Load nutrition summary from backend
    const loadMealsSummary = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`/api/meals?userId=${user.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("✓ Nutrition data synced from backend:", data.response);
        }
      } catch (error) {
        console.log("Backend nutrition sync optional - using local data");
      }
    };

    loadMealsSummary();
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

  // Search foods — common foods instant, OpenFoodFacts for others
  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDropdown(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Instant common food lookup
    const instant = lookupCommon(query);
    if (instant) {
      setResults([instant]);
      setShowDropdown(true);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const found = await searchFood(query);
      setResults(found);
      setShowDropdown(found.length > 0);
      setSearching(false);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const saveMealToHistory = async (meal: Meal) => {
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

    // Sync meal to backend
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: `I logged a meal: ${meal.name} with ${meal.calories} calories, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fats}g fats`,
          userProfile: {
            id: user.id,
            dailyCalorieGoal: userProfile?.dailyCalorieGoal,
            primaryGoal: userProfile?.primaryGoal,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✓ Meal synced to backend:", data.response);
      }
    } catch (error) {
      console.error("Failed to sync meal to backend:", error);
      // Continue - localStorage serves as offline fallback
    }
  };

  const selectFood = (food: FoodResult) => {
    setSelected(food);
    setQuery(food.food_name);
    setShowDropdown(false);
    setServings(1);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setServings(1);
    setLogSuccess(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Photo analysis handlers
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setAnalysisResult(null);
    setAnalysisError("");
  };

  const analyzeImage = async () => {
    if (!imageFile || !user) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("user_id", user.id);
      formData.append("meal_type", mealType);
      
      const response = await fetch("/api/nutrition/meals/analyze-image", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to analyze image");
      }
      
      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (error: any) {
      setAnalysisError(error.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddAnalyzedMeal = () => {
    if (!analysisResult) return;
    const meal: Meal = {
      name: analysisResult.food_name,
      calories: Math.round(analysisResult.calories),
      protein: analysisResult.protein_g,
      carbs: analysisResult.carbs_g,
      fats: analysisResult.fat_g,
    };
    setMeals(prev => [...prev, meal]);
    saveMealToHistory(meal);
    // Reset photo analysis states
    setImageFile(null);
    setImagePreview("");
    setAnalysisResult(null);
    setAnalysisError("");
  };

  // Scaled macros for selected food × servings
  const scaled = selected ? {
    calories:  Math.round(selected.calories  * servings),
    protein_g: Math.round(selected.protein_g * servings * 10) / 10,
    carbs_g:   Math.round(selected.carbs_g   * servings * 10) / 10,
    fat_g:     Math.round(selected.fat_g     * servings * 10) / 10,
  } : null;

  const handleLogMeal = async () => {
    if (!selected || !scaled) return;
    setLogging(true);
    const meal: Meal = {
      name:     `${query} (${servings}× ${selected.serving})`,
      calories: scaled.calories,
      protein:  scaled.protein_g,
      carbs:    scaled.carbs_g,
      fats:     scaled.fat_g,
    };
    setMeals((prev) => [...prev, meal]);
    await saveMealToHistory(meal);
    setLogging(false);
    setLogSuccess(true);
    setTimeout(() => { clearSelection(); setLogSuccess(false); }, 2000);
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
    
    let cat = "maintain";
    if (["lose-weight", "weight-loss"].includes(goal)) cat = "lose-weight";
    else if (["build-muscle", "muscle-gain", "lower-body-strength", "glute-strength", "core-strength"].includes(goal)) cat = "build-muscle";
    
    return s[cat] || s["maintain"];
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

          <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700 self-start">
            <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
              🔍 Log Meal
              <span className="text-xs font-normal text-slate-400 ml-auto">auto-fills nutrition</span>
            </h3>

            {/* Photo upload section */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">📷 Log Meal from Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="block w-full text-sm text-slate-400 cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 mb-2"
              />
              {imagePreview && (
                <div className="mb-2">
                  <img src={imagePreview} alt="Meal preview" className="max-h-48 rounded-lg border border-slate-600 object-cover w-full" />
                </div>
              )}
              {imageFile && !analyzing && !analysisResult && (
                <button
                  onClick={analyzeImage}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Analyze Meal
                </button>
              )}
              {analyzing && (
                <div className="text-center text-slate-300 text-sm py-2">
                  <div className="animate-spin inline-block h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  Analyzing...
                </div>
              )}
              {analysisError && (
                <p className="text-red-400 text-xs text-center mt-1">{analysisError}</p>
              )}
              {analysisResult && (
                <div className="mt-3 bg-slate-700/50 border border-slate-600 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{analysisResult.food_name}</p>
                      <p className="text-xs text-slate-400">{analysisResult.description}</p>
                      <p className="text-xs text-slate-400">Estimated: {analysisResult.portion_estimate}</p>
                    </div>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {Math.round(analysisResult.confidence * 100)}% confident
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                    {[
                      { val: Math.round(analysisResult.calories), label: "kcal", color: "text-orange-500" },
                      { val: Math.round(analysisResult.protein_g * 10) / 10, label: "protein", color: "text-red-500" },
                      { val: Math.round(analysisResult.carbs_g * 10) / 10, label: "carbs", color: "text-blue-500" },
                      { val: Math.round(analysisResult.fat_g * 10) / 10, label: "fats", color: "text-yellow-500" },
                    ].map((m, idx) => (
                      <div key={idx} className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                        <p className={`text-sm font-bold ${m.color}`}>{m.val}</p>
                        <p className="text-xs text-slate-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Meal type</label>
                    <select value={mealType} onChange={(e) => setMealType(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="breakfast">🌅 Breakfast</option>
                      <option value="lunch">☀️ Lunch</option>
                      <option value="dinner">🌙 Dinner</option>
                      <option value="snack">🍎 Snack</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddAnalyzedMeal}
                    disabled={logging || logSuccess}
                    className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                      logSuccess
                        ? "bg-green-500 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {logSuccess ? "✓ Logged!" : "Add to Today"}
                  </button>
                </div>
              )}
            </div>
            {/* End photo upload section */}

            {/* Search input */}
            <div className="relative mb-3">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a food (e.g. banana, chicken breast...)"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); setLogSuccess(false); }}
                onFocus={() => results.length > 0 && !selected && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                className="w-full px-3 py-2.5 pr-8 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full" />
                </div>
              )}
              {selected && (
                <button onClick={clearSelection}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-sm">✕</button>
              )}

              {/* Dropdown results */}
              {showDropdown && results.length > 0 && !selected && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-20 overflow-hidden">
                  {results.map((food, i) => (
                    <button key={i} onMouseDown={() => selectFood(food)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-600 border-b border-slate-600 last:border-b-0 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-semibold text-slate-100 truncate">{food.food_name}</p>
                          <p className="text-xs text-slate-400">{food.serving}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-orange-500">{food.calories} kcal</p>
                          <p className="text-xs text-slate-400">
                            P{food.protein_g}g C{food.carbs_g}g F{food.fat_g}g
                          </p>
                        </div>
                      </div>
                      {food.confidence === "estimated" && (
                        <p className="text-xs text-amber-500 mt-0.5">~ estimated values</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected food + macro preview */}
            {selected && scaled && (
              <div className="mb-3 bg-slate-700/50 border border-slate-600 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{selected.food_name}</p>
                    <p className="text-xs text-slate-400">{selected.serving} per serving</p>
                  </div>
                  {selected.confidence === "exact" && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">✓ exact</span>
                  )}
                </div>

                {/* Servings control */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-slate-400 font-medium">Servings:</span>
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1">
                    <button onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                      className="text-slate-400 hover:text-slate-200 font-bold text-sm w-5 text-center">−</button>
                    <span className="text-sm font-bold text-slate-100 min-w-[2rem] text-center">{servings}</span>
                    <button onClick={() => setServings(servings + 0.5)}
                      className="text-slate-400 hover:text-slate-200 font-bold text-sm w-5 text-center">+</button>
                  </div>
                </div>

                {/* Macro grid */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { val: scaled.calories,  label: "kcal",   color: "text-orange-500" },
                    { val: scaled.protein_g, label: "protein",color: "text-red-500"    },
                    { val: scaled.carbs_g,   label: "carbs",  color: "text-blue-500"   },
                    { val: scaled.fat_g,     label: "fats",   color: "text-yellow-500" },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                      <p className={`text-sm font-bold ${m.color}`}>{m.val}</p>
                      <p className="text-xs text-slate-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meal type selector */}
            {selected && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">Meal type</label>
                <select value={mealType} onChange={(e) => setMealType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="breakfast">🌅 Breakfast</option>
                  <option value="lunch">☀️ Lunch</option>
                  <option value="dinner">🌙 Dinner</option>
                  <option value="snack">🍎 Snack</option>
                </select>
              </div>
            )}

            {/* Log button */}
            <button
              onClick={selected ? handleLogMeal : undefined}
              disabled={!selected || logging || logSuccess}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                logSuccess
                  ? "bg-green-500 text-white"
                  : selected
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}>
              {logSuccess ? "✓ Logged!" : logging ? "Logging..." : selected ? `Log ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}` : "Search for a food first"}
            </button>

            {/* Tip */}
            {!selected && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Try: "banana", "chicken breast", "oats", "rice"
              </p>
            )}
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