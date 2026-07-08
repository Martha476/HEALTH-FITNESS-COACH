"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import TopNavBar from "../components/TopNavBar";

// ─── Sync helpers ────────────────────────────────────────────────────────────
function scopedKey(userId: string, key: string) {
  return `user_${userId}_${key}`;
}

function readList<T>(userId: string, key: string): T[] {
  try {
    const scoped = localStorage.getItem(scopedKey(userId, key));
    if (scoped) return JSON.parse(scoped) as T[];
    const global = localStorage.getItem(key);
    if (global) return JSON.parse(global) as T[];
  } catch {}
  return [];
}

function readObject<T extends object>(userId: string, key: string): T {
  try {
    const scoped = localStorage.getItem(scopedKey(userId, key));
    if (scoped) return JSON.parse(scoped) as T;
    const global = localStorage.getItem(key);
    if (global) return JSON.parse(global) as T;
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
  mealHistory: "mealHistory",
  userProfile: "userProfile",
  waterIntake: "waterIntake",
  waterDate: "waterIntakeDate",
} as const;

// ─── OpenFoodFacts search ──────────────────────────────────────────────────
async function searchFood(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments,serving_size,quantity`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.products?.length) return [];

    return data.products
      .filter((p: any) => p.product_name && p.nutriments?.["energy-kcal_100g"])
      .slice(0, 8)
      .map((p: any) => {
        const n = p.nutriments;
        const per = 100;
        return {
          food_name: p.product_name,
          calories: Math.round(n["energy-kcal_100g"] || 0),
          protein_g: Math.round((n["proteins_100g"] || 0) * 10) / 10,
          carbs_g: Math.round((n["carbohydrates_100g"] || 0) * 10) / 10,
          fat_g: Math.round((n["fat_100g"] || 0) * 10) / 10,
          serving: p.serving_size || `per ${per}g`,
          confidence: "exact" as const,
        };
      });
  } catch {
    return [];
  }
}

// ─── Expanded Common Foods (including local foods) ────────────────────────
const COMMON: Record<string, FoodResult> = {
  // Fruits
  "banana": { food_name: "Banana (medium)", calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, serving: "118g", confidence: "exact" },
  "apple": { food_name: "Apple (medium)", calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, serving: "182g", confidence: "exact" },
  "orange": { food_name: "Orange (medium)", calories: 62, protein_g: 1.2, carbs_g: 15, fat_g: 0.2, serving: "131g", confidence: "exact" },
  "mango": { food_name: "Mango (medium)", calories: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4, serving: "200g", confidence: "exact" },
  "avocado": { food_name: "Avocado (half)", calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15, serving: "100g", confidence: "exact" },
  "strawberries": { food_name: "Strawberries", calories: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3, serving: "100g", confidence: "exact" },
  
  // Vegetables
  "broccoli": { food_name: "Broccoli (steamed)", calories: 35, protein_g: 2.4, carbs_g: 7, fat_g: 0.4, serving: "100g", confidence: "exact" },
  "spinach": { food_name: "Spinach (raw)", calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, serving: "100g", confidence: "exact" },
  "sweet potato": { food_name: "Sweet Potato (baked)", calories: 103, protein_g: 2.3, carbs_g: 24, fat_g: 0.1, serving: "150g", confidence: "exact" },
  "potato": { food_name: "Potato (baked)", calories: 93, protein_g: 2.5, carbs_g: 21, fat_g: 0.1, serving: "150g", confidence: "exact" },
  
  // Proteins
  "chicken breast": { food_name: "Chicken Breast (grilled)", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, serving: "100g", confidence: "exact" },
  "chicken": { food_name: "Chicken Breast (grilled)", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, serving: "100g", confidence: "exact" },
  "egg": { food_name: "Boiled Egg (large)", calories: 78, protein_g: 6.3, carbs_g: 0.6, fat_g: 5.3, serving: "50g", confidence: "exact" },
  "eggs": { food_name: "Boiled Egg (large)", calories: 78, protein_g: 6.3, carbs_g: 0.6, fat_g: 5.3, serving: "50g", confidence: "exact" },
  "salmon": { food_name: "Salmon (grilled)", calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, serving: "100g", confidence: "exact" },
  "tuna": { food_name: "Tuna (canned in water)", calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1, serving: "100g", confidence: "exact" },
  "beef": { food_name: "Beef (lean, cooked)", calories: 217, protein_g: 26, carbs_g: 0, fat_g: 12, serving: "100g", confidence: "exact" },
  "steak": { food_name: "Beef Steak (grilled)", calories: 271, protein_g: 26, carbs_g: 0, fat_g: 18, serving: "100g", confidence: "exact" },
  
  // Grains & Carbs
  "rice": { food_name: "White Rice (cooked)", calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, serving: "100g", confidence: "exact" },
  "brown rice": { food_name: "Brown Rice (cooked)", calories: 112, protein_g: 2.6, carbs_g: 24, fat_g: 0.9, serving: "100g", confidence: "exact" },
  "pasta": { food_name: "Pasta (cooked)", calories: 158, protein_g: 5.8, carbs_g: 31, fat_g: 0.9, serving: "100g", confidence: "exact" },
  "bread": { food_name: "Whole Wheat Bread", calories: 247, protein_g: 13, carbs_g: 41, fat_g: 3.4, serving: "100g", confidence: "exact" },
  "toast": { food_name: "Whole Wheat Toast (1 slice)", calories: 74, protein_g: 4, carbs_g: 12, fat_g: 1, serving: "30g", confidence: "exact" },
  "oatmeal": { food_name: "Oatmeal (cooked)", calories: 71, protein_g: 2.5, carbs_g: 12, fat_g: 1.5, serving: "100g", confidence: "exact" },
  "oats": { food_name: "Rolled Oats (dry)", calories: 389, protein_g: 17, carbs_g: 66, fat_g: 7, serving: "100g", confidence: "exact" },
  "quinoa": { food_name: "Quinoa (cooked)", calories: 120, protein_g: 4.4, carbs_g: 22, fat_g: 1.9, serving: "100g", confidence: "exact" },
  
  // Local Foods
  "ugali": { food_name: "Ugali (cornmeal porridge)", calories: 110, protein_g: 2.5, carbs_g: 24, fat_g: 0.5, serving: "100g", confidence: "estimated" },
  "chapati": { food_name: "Chapati (whole wheat flatbread)", calories: 270, protein_g: 8, carbs_g: 45, fat_g: 7, serving: "1 piece (60g)", confidence: "estimated" },
  "sukuma wiki": { food_name: "Sukuma Wiki (collard greens)", calories: 45, protein_g: 3, carbs_g: 7, fat_g: 0.5, serving: "100g", confidence: "estimated" },
  "nyama choma": { food_name: "Nyama Choma (grilled meat)", calories: 250, protein_g: 30, carbs_g: 0, fat_g: 15, serving: "100g", confidence: "estimated" },
  "pilau": { food_name: "Pilau (spiced rice)", calories: 180, protein_g: 4, carbs_g: 35, fat_g: 3, serving: "100g", confidence: "estimated" },
  
  // Dairy
  "milk": { food_name: "Whole Milk", calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, serving: "100ml", confidence: "exact" },
  "yogurt": { food_name: "Greek Yogurt (plain)", calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, serving: "100g", confidence: "exact" },
  "cheese": { food_name: "Cheddar Cheese", calories: 402, protein_g: 25, carbs_g: 1.3, fat_g: 33, serving: "100g", confidence: "exact" },
  
  // Nuts & Seeds
  "peanut butter": { food_name: "Peanut Butter", calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50, serving: "100g", confidence: "exact" },
  "almonds": { food_name: "Almonds", calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50, serving: "100g", confidence: "exact" },
  "lentils": { food_name: "Lentils (cooked)", calories: 116, protein_g: 9, carbs_g: 20, fat_g: 0.4, serving: "100g", confidence: "exact" },
  
  // Common Meals
  "pizza": { food_name: "Pizza (cheese, 1 slice)", calories: 272, protein_g: 12, carbs_g: 34, fat_g: 10, serving: "107g", confidence: "estimated" },
  "burger": { food_name: "Beef Burger", calories: 354, protein_g: 20, carbs_g: 29, fat_g: 17, serving: "150g", confidence: "estimated" },
  "protein shake": { food_name: "Protein Shake (whey)", calories: 120, protein_g: 25, carbs_g: 5, fat_g: 2, serving: "1 scoop", confidence: "estimated" },
  "coffee": { food_name: "Black Coffee", calories: 2, protein_g: 0.3, carbs_g: 0, fat_g: 0, serving: "240ml", confidence: "exact" },
};

function lookupCommon(query: string): FoodResult | null {
  const q = query.toLowerCase().trim();
  if (COMMON[q]) return COMMON[q];
  for (const key of Object.keys(COMMON)) {
    if (q.includes(key) || key.includes(q)) return COMMON[key];
  }
  return null;
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source?: "search" | "photo" | "manual";
}
interface SavedMeal extends Meal {
  id: string;
  date: string;
  time: string;
}
interface UserProfile {
  primaryGoal?: string;
  dailyCalorieGoal?: number;
  fitnessLevel?: string;
  dietaryPreference?: string;
}
interface FoodResult {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving: string;
  confidence: "exact" | "estimated";
}

interface AnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: number;
  mealType: string;
  description: string;
}

// ─── Image Slider Data ──────────────────────────────────────────────────────
const sliderImages = [
  {
    url: "/images/The Power of Food_ Exploring the Benefits of Nutritious Diet.jpg",
    title: "The Power of Food",
    description: "Explore the benefits of a nutritious diet"
  },
  {
    url: "/images/Healthy Lifestyle.jpg",
    title: "Healthy Lifestyle",
    description: "Build sustainable healthy habits"
  },
  {
    url: "/images/Calorie Deficit Calculator – Calculate, Plan & Maintain Your Ideal Weight.jpg",
    title: "Calorie Deficit Calculator",
    description: "Calculate and maintain your ideal weight"
  },
  {
    url: "/images/Food Choices,Mental Outcomes________.jpg",
    title: "Food Choices & Mental Health",
    description: "How food impacts your mental outcomes"
  },
  {
    url: "/images/Discover simple and natural ways to strengthen your immune system with healthy foods, daily habits,.jpg",
    title: "Strengthen Your Immune System",
    description: "Natural ways to boost immunity with healthy foods"
  },
  {
    url: "/images/Healthy Habits That Support Weight Loss Naturally.jpg",
    title: "Healthy Habits for Weight Loss",
    description: "Natural and sustainable weight loss habits"
  },
  {
    url: "/images/Eat or pass_.jpg",
    title: "Smart Food Choices",
    description: "Make the right choices for your goals"
  },
  {
    url: "/images/Natural Way to Support Your Teeth.jpg",
    title: "Nutritional Dental Health",
    description: "Support your teeth naturally through nutrition"
  },
  {
    url: "/images/Health and Fitness.jpg",
    title: "Health & Fitness Connection",
    description: "Nutrition fuels your fitness journey"
  },
  {
    url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&auto=format&fit=crop",
    title: "Fresh & Healthy",
    description: "Start your day with nutritious meals"
  }
];

// ─── Meal Suggestion Data ──────────────────────────────────────────────────
const mealSuggestions = [
  { name: "Mediterranean Bowl", description: "Salmon, quinoa, roasted veg", calories: 485, protein: 34, carbs: 42, fats: 18 },
  { name: "Protein Power Bowl", description: "Chicken, quinoa, lentils, avocado", calories: 785, protein: 62, carbs: 68, fats: 26 },
  { name: "Balanced Buddha Bowl", description: "Tofu, brown rice, roasted veggies", calories: 550, protein: 32, carbs: 62, fats: 18 },
  { name: "Carb-Loading Pasta", description: "Whole wheat pasta, turkey meatballs", calories: 720, protein: 42, carbs: 92, fats: 18 },
];

// ════════════════════════════════════════════════════════════════════════════
// Nutrition Page
// ════════════════════════════════════════════════════════════════════════════
export default function Nutrition() {
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealHistory, setMealHistory] = useState<SavedMeal[]>([]);
  const [activeTab, setActiveTab] = useState("today");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Image Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const sliderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Food Search
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState("lunch");
  const [showDropdown, setShowDropdown] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  // Photo Detection
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [showPhotoTab, setShowPhotoTab] = useState(false);

  // Refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Slider Functions ─────────────────────────────────────────────────────
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    resetAutoPlay();
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    resetAutoPlay();
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
    resetAutoPlay();
  };

  const resetAutoPlay = () => {
    if (sliderIntervalRef.current) clearInterval(sliderIntervalRef.current);
    if (isAutoPlaying) {
      sliderIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
      }, 5000);
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
    if (!isAutoPlaying) resetAutoPlay();
    else if (sliderIntervalRef.current) clearInterval(sliderIntervalRef.current);
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const history = readList<SavedMeal>(user.id, KEYS.mealHistory);
    setMealHistory(history);

    const savedWater = localStorage.getItem(KEYS.waterIntake);
    const savedDate = localStorage.getItem(KEYS.waterDate);
    const today = new Date().toDateString();
    setWaterGlasses(savedWater && savedDate === today ? parseInt(savedWater) : 0);
    if (!savedDate || savedDate !== today) {
      localStorage.setItem(KEYS.waterIntake, "0");
      localStorage.setItem(KEYS.waterDate, today);
    }

    const profile = readObject<UserProfile>(user.id, KEYS.userProfile);
    setUserProfile(Object.keys(profile).length > 0 ? profile : null);
  }, [user?.id]);

  useEffect(() => {
    resetAutoPlay();
    return () => { if (sliderIntervalRef.current) clearInterval(sliderIntervalRef.current); };
  }, []);

  // Food Search
  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDropdown(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);

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

  // ─── Meal Functions ──────────────────────────────────────────────────────
  const saveMealToHistory = async (meal: Meal) => {
    if (!user) return;
    const saved: SavedMeal = {
      ...meal,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [saved, ...mealHistory];
    setMealHistory(updated);
    writeData(user.id, KEYS.mealHistory, updated);

    try {
      const token = localStorage.getItem("authToken");
      await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: `Logged meal: ${meal.name} - ${meal.calories} kcal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fats}g fats`,
          userProfile: { id: user.id, dailyCalorieGoal: userProfile?.dailyCalorieGoal },
        }),
      });
    } catch (error) {
      console.error("Failed to sync meal:", error);
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

  // ─── Photo Analysis ──────────────────────────────────────────────────────
  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setAnalysisResult(null);
    setAnalysisError("");

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setAnalyzing(true);

    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/nutrition/meals/analyze-image", {
        method: "POST",
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.calories) {
          setAnalysisResult({
            name: data.name || "Detected Meal",
            calories: data.calories,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fats: data.fats || 0,
            confidence: data.confidence || 0.85,
            mealType: data.mealType || "lunch",
            description: data.message || "Auto-detected from image",
          });
          if (data.mealType) setMealType(data.mealType);
        } else {
          throw new Error(data.message || "Analysis returned no data");
        }
      } else {
        const err = await response.json();
        throw new Error(err.detail || err.error || "Analysis failed");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      setAnalysisError(error.message || "Could not analyze image. Try manual search below.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddAnalyzedMeal = () => {
    if (!analysisResult) return;
    const meal: Meal = {
      name: analysisResult.name,
      calories: Math.round(analysisResult.calories),
      protein: analysisResult.protein,
      carbs: analysisResult.carbs,
      fats: analysisResult.fats,
      source: "photo",
    };
    setMeals((prev) => [...prev, meal]);
    saveMealToHistory(meal);
    setImageFile(null);
    setImagePreview("");
    setAnalysisResult(null);
    setAnalysisError("");
    setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  };

  // ─── Log Meal ─────────────────────────────────────────────────────────────
  const scaled = selected
    ? {
        calories: Math.round(selected.calories * servings),
        protein_g: Math.round(selected.protein_g * servings * 10) / 10,
        carbs_g: Math.round(selected.carbs_g * servings * 10) / 10,
        fat_g: Math.round(selected.fat_g * servings * 10) / 10,
      }
    : null;

  const handleLogMeal = async () => {
    if (!selected || !scaled) return;
    setLogging(true);
    const meal: Meal = {
      name: `${query} (${servings}× ${selected.serving})`,
      calories: scaled.calories,
      protein: scaled.protein_g,
      carbs: scaled.carbs_g,
      fats: scaled.fat_g,
      source: "search",
    };
    setMeals((prev) => [...prev, meal]);
    await saveMealToHistory(meal);
    setLogging(false);
    setLogSuccess(true);
    setTimeout(() => {
      clearSelection();
      setLogSuccess(false);
    }, 2000);
  };

  // ─── Water ─────────────────────────────────────────────────────────────────
  const addWaterGlass = () => {
    if (waterGlasses >= 12) return;
    const n = waterGlasses + 1;
    setWaterGlasses(n);
    localStorage.setItem(KEYS.waterIntake, n.toString());
    localStorage.setItem(KEYS.waterDate, new Date().toDateString());
  };

  const resetWater = () => {
    setWaterGlasses(0);
    localStorage.setItem(KEYS.waterIntake, "0");
    localStorage.setItem(KEYS.waterDate, new Date().toDateString());
  };

  // ─── Calculations ────────────────────────────────────────────────────────
  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFats = meals.reduce((s, m) => s + m.fats, 0);

  const dailyGoals = {
    calories: userProfile?.dailyCalorieGoal || 2000,
    protein: Math.round(((userProfile?.dailyCalorieGoal || 2000) * 0.3) / 4),
    carbs: Math.round(((userProfile?.dailyCalorieGoal || 2000) * 0.4) / 4),
    fats: Math.round(((userProfile?.dailyCalorieGoal || 2000) * 0.3) / 9),
  };

  const waterPct = Math.min((waterGlasses / 8) * 100, 100);
  const calPct = Math.min((totalCalories / dailyGoals.calories) * 100, 100);
  const proteinPct = Math.min((totalProtein / dailyGoals.protein) * 100, 100);
  const carbsPct = Math.min((totalCarbs / dailyGoals.carbs) * 100, 100);
  const fatsPct = Math.min((totalFats / dailyGoals.fats) * 100, 100);

  return (
    <>
      <TopNavBar />
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-14 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100">🥗 Nutrition Planner</h1>
          <p className="text-slate-400 mt-2 text-base">
            Track your meals, log with photos, and get AI-powered recommendations
          </p>
        </div>

        {/* Image Slider */}
        <div className="mb-6 rounded-2xl shadow-2xl overflow-hidden bg-slate-800 border border-slate-700 relative group">
          <div className="relative h-[220px] md:h-[260px] overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-in-out h-full"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {sliderImages.map((image, index) => (
                <div key={index} className="min-w-full h-full relative flex-shrink-0">
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5 text-white">
                    <div className="max-w-2xl">
                      <h2 className="text-lg md:text-2xl font-bold mb-1 drop-shadow-lg">
                        {image.title}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-200 drop-shadow-lg">
                        {image.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <button
              onClick={prevSlide}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-green-600 text-white p-2 md:p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-green-600 text-white p-2 md:p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Indicators */}
            <div className="absolute bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {sliderImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === index ? "w-8 bg-green-500" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={toggleAutoPlay}
              className="absolute top-4 right-4 bg-black/50 hover:bg-slate-700 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
            >
              {isAutoPlaying ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-green-900/90 to-emerald-900/90 p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl">🥗</span>
              <div>
                <h3 className="text-white font-bold text-sm md:text-base">Fuel Your Body Right</h3>
                <p className="text-green-200 text-xs md:text-sm">
                  Plan balanced meals, track macros, achieve your goals
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("suggestions")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-all transform hover:scale-105 text-sm whitespace-nowrap shadow-lg shadow-green-900/30"
            >
              Explore Recommendations 🔍
            </button>
          </div>
        </div>

        {/* Profile Prompt */}
        {(!userProfile || !userProfile.dailyCalorieGoal) && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-l-4 border-amber-500 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <div className="text-xl"></div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-300 mb-1">Set Your Daily Nutrition Goals</h3>
                <p className="text-xs text-slate-300 mb-2">
                  Complete your profile to get personalized calorie targets and AI meal recommendations.
                </p>
                <button
                  onClick={() => router.push("/profile")}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  Complete Profile →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Display */}
        {userProfile?.primaryGoal && (
          <div className="mb-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-3 border border-green-700/30">
            <p className="text-sm text-green-300 flex items-center gap-2">
              <span>🎯</span> Your goal: <strong>{userProfile.primaryGoal}</strong> — Recommendations are personalized
            </p>
          </div>
        )}

        {/* Water Intake */}
        <div className="mb-6 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl shadow-lg p-5 border border-blue-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-2">
                <span>💧</span> Water Intake
              </h2>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={addWaterGlass}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <span>💧</span> Log Glass
                </button>
                <button
                  onClick={resetWater}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 text-sm rounded-lg font-semibold transition-all"
                >
                  Reset
                </button>
              </div>
              <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300 font-semibold text-sm">Today&apos;s Progress</span>
                  <span className="text-blue-400 font-bold text-sm">{waterGlasses} / 8 glasses</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-3">
                  <div
                    className="h-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Target: 2L (8 glasses) per day</p>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative w-48 h-64 rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&auto=format&fit=crop&q=80"
                  alt="Water"
                  className="w-full h-full object-cover"
                />
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
            { label: "Calories", value: totalCalories, goal: dailyGoals.calories, unit: "kcal", color: "amber", pct: calPct },
            { label: "Protein", value: totalProtein, goal: dailyGoals.protein, unit: "g", color: "red", pct: proteinPct },
            { label: "Carbs", value: totalCarbs, goal: dailyGoals.carbs, unit: "g", color: "blue", pct: carbsPct },
            { label: "Fats", value: totalFats, goal: dailyGoals.fats, unit: "g", color: "yellow", pct: fatsPct },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700">
              <div className="text-center">
                <p className="text-slate-400 text-xs font-medium">{stat.label}</p>
                <p className={`text-3xl font-bold text-${stat.color}-500 mt-1`}>
                  {stat.value}
                  {stat.unit !== "kcal" ? stat.unit : ""}
                </p>
                <p className="text-slate-400 text-xs mt-1">/ {stat.goal} {stat.unit}</p>
                <div className="mt-2 w-full h-2 bg-slate-600 rounded-full">
                  <div
                    className={`h-2 bg-${stat.color}-500 rounded-full transition-all duration-500`}
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 border-b border-slate-700 flex-wrap">
          {["today", "suggestions", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 font-semibold text-sm ${
                activeTab === tab
                  ? "text-green-400 border-b-2 border-green-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "today" && "Today's Meals"}
              {tab === "suggestions" && "AI Suggestions"}
              {tab === "history" && `History (${mealHistory.length})`}
            </button>
          ))}
        </div>

        {/* Today's Meals */}
        {activeTab === "today" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meal List */}
            <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
              <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-100">Today&apos;s Meals</h2>
                <span className="text-sm text-slate-400">{meals.length} logged</span>
              </div>
              {meals.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">🍽️</div>
                  <p className="text-slate-400 text-base">No meals logged today</p>
                  <p className="text-slate-500 text-sm mt-2">Log a meal using the card on the right →</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {meals.map((meal, idx) => (
                    <div key={idx} className="p-4 px-5 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                          {meal.source === "photo" && <span className="text-xs">📷</span>}
                          {meal.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g
                          {meal.source === "photo" && (
                            <span className="ml-2 text-green-400 text-[10px] bg-green-900/30 px-2 py-0.5 rounded-full">
                              AI Detected
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-500 text-sm">{meal.calories} kcal</p>
                        <button
                          onClick={() => setMeals(meals.filter((_, i) => i !== idx))}
                          className="text-red-500 text-xs hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Log Meal Card */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700 self-start">
              <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                🔍 Log Meal
                <span className="text-xs font-normal text-slate-400 ml-auto">auto-calculates macros</span>
              </h3>

              {/* Toggle between Photo and Search */}
              <div className="flex gap-2 mb-4 bg-slate-700/50 rounded-lg p-1">
                <button
                  onClick={() => setShowPhotoTab(false)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                    !showPhotoTab
                      ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🔍 Search
                </button>
                <button
                  onClick={() => setShowPhotoTab(true)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                    showPhotoTab
                      ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  📷 Photo
                </button>
              </div>

              {/* Photo Upload Tab */}
              {showPhotoTab ? (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Upload a photo of your meal
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="block w-full text-sm text-slate-400 cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 mb-2"
                  />
                  <p className="text-xs text-slate-500">
                     Upload any food photo — AI will detect and calculate macros automatically
                  </p>

                  {imagePreview && analyzing && (
                    <div className="mt-3 text-center py-4 bg-slate-700/30 rounded-lg">
                      <div className="animate-spin inline-block h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full" />
                      <p className="text-slate-300 text-xs mt-2">AI analyzing your meal...</p>
                    </div>
                  )}

                  {analysisError && !analyzing && (
                    <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                      <p className="text-red-400 text-xs">{analysisError}</p>
                    </div>
                  )}

                  {analysisResult && !analyzing && (
                    <div className="mt-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            <span>📷</span> {analysisResult.name}
                          </p>
                          <p className="text-xs text-slate-400">{analysisResult.description}</p>
                        </div>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                          {Math.round(analysisResult.confidence * 100)}% confidence
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-orange-500">{Math.round(analysisResult.calories)}</p>
                          <p className="text-[10px] text-slate-400">kcal</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-red-500">{analysisResult.protein}g</p>
                          <p className="text-[10px] text-slate-400">protein</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-blue-500">{analysisResult.carbs}g</p>
                          <p className="text-[10px] text-slate-400">carbs</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-yellow-500">{analysisResult.fats}g</p>
                          <p className="text-[10px] text-slate-400">fats</p>
                        </div>
                      </div>
                      <button
                        onClick={handleAddAnalyzedMeal}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold transition-all"
                      >
                        Add to Today
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Search Tab */
                <>
                  <div className="relative mb-3">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search for food (e.g. banana, chicken, ugali...)"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSelected(null);
                        setLogSuccess(false);
                      }}
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
                      <button
                        onClick={clearSelection}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-sm"
                      >
                        ✕
                      </button>
                    )}

                    {showDropdown && results.length > 0 && !selected && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {results.map((food, i) => (
                          <button
                            key={i}
                            onMouseDown={() => selectFood(food)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-600 border-b border-slate-600 last:border-b-0 transition-colors"
                          >
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
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected && scaled && (
                    <div className="mb-3 bg-slate-700/50 border border-slate-600 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-100">{selected.food_name}</p>
                          <p className="text-xs text-slate-400">{selected.serving} per serving</p>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                          {selected.confidence}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs text-slate-400 font-medium">Servings:</span>
                        <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1">
                          <button
                            onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                            className="text-slate-400 hover:text-slate-200 font-bold text-sm w-5"
                          >
                            −
                          </button>
                          <span className="text-sm font-bold text-slate-100 min-w-[2rem] text-center">
                            {servings}
                          </span>
                          <button
                            onClick={() => setServings(servings + 0.5)}
                            className="text-slate-400 hover:text-slate-200 font-bold text-sm w-5"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-orange-500">{scaled.calories}</p>
                          <p className="text-[10px] text-slate-400">kcal</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-red-500">{scaled.protein_g}g</p>
                          <p className="text-[10px] text-slate-400">protein</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-blue-500">{scaled.carbs_g}g</p>
                          <p className="text-[10px] text-slate-400">carbs</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg py-2 border border-slate-600">
                          <p className="text-sm font-bold text-yellow-500">{scaled.fat_g}g</p>
                          <p className="text-[10px] text-slate-400">fats</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selected && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Meal type</label>
                      <select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="breakfast">🌅 Breakfast</option>
                        <option value="lunch">☀️ Lunch</option>
                        <option value="dinner">🌙 Dinner</option>
                        <option value="snack">🍎 Snack</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Log Button */}
              {!showPhotoTab && (
                <button
                  onClick={selected ? handleLogMeal : undefined}
                  disabled={!selected || logging || logSuccess}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                    logSuccess
                      ? "bg-green-500 text-white"
                      : selected
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {logSuccess ? "✓ Logged!" : logging ? "Logging..." : selected ? `Log ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}` : "Search for a food first"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {activeTab === "suggestions" && (
          <div>
            <div className="mb-4 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-l-4 border-green-500 rounded-xl p-4">
              <p className="text-sm text-green-300 flex items-center gap-2">
                <span>🧬</span> Recommended meals based on your goal:{" "}
                <strong>{userProfile?.primaryGoal || "maintain"}</strong>
                {userProfile?.dietaryPreference && ` • Diet: ${userProfile.dietaryPreference}`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mealSuggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700 hover:border-green-700/50 transition-all hover:shadow-xl hover:shadow-green-900/20"
                >
                  <div className="relative h-32 bg-gradient-to-br from-green-900/50 to-emerald-900/50 flex items-center justify-center">
                    <span className="text-5xl">🍽️</span>
                    <div className="absolute top-3 right-3 bg-green-500/90 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                      🧬 Recommended
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-100 mb-1">{s.name}</h3>
                    <p className="text-slate-400 text-sm mb-2">{s.description}</p>
                    <div className="grid grid-cols-4 gap-2 text-center mb-4">
                      <div className="bg-slate-700/50 rounded-lg py-2 px-1 border border-slate-600">
                        <p className="text-orange-500 font-bold text-base">{s.calories}</p>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wide">Cal</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg py-2 px-1 border border-slate-600">
                        <p className="text-red-500 font-bold text-base">{s.protein}g</p>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wide">Protein</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg py-2 px-1 border border-slate-600">
                        <p className="text-blue-500 font-bold text-base">{s.carbs}g</p>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wide">Carbs</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg py-2 px-1 border border-slate-600">
                        <p className="text-yellow-500 font-bold text-base">{s.fats}g</p>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wide">Fats</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const meal: Meal = {
                          name: s.name,
                          calories: s.calories,
                          protein: s.protein,
                          carbs: s.carbs,
                          fats: s.fats,
                        };
                        setMeals([...meals, meal]);
                        saveMealToHistory(meal);
                        setActiveTab("today");
                      }}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-green-900/30 hover:shadow-green-900/50 transform hover:scale-[1.02]"
                    >
                      Add to Today
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">Meal History</h2>
              <span className="text-sm text-slate-400">{mealHistory.length} total meals</span>
            </div>
            {mealHistory.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-slate-400 text-base mb-2">No meal history yet</p>
                <p className="text-slate-500 text-sm">Start logging meals to track your nutrition</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {mealHistory.map((meal) => (
                  <div key={meal.id} className="p-4 px-5 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                        {meal.source === "photo" && <span className="text-xs">📷</span>}
                        {meal.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(meal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {meal.time} • {meal.calories} kcal
                      </p>
                      <p className="text-xs text-slate-500">P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g</p>
                    </div>
                    <button
                      onClick={() => {
                        const m: Meal = {
                          name: meal.name,
                          calories: meal.calories,
                          protein: meal.protein,
                          carbs: meal.carbs,
                          fats: meal.fats,
                        };
                        setMeals([...meals, m]);
                        setActiveTab("today");
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition-colors text-xs"
                    >
                      Add Again
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        .group:hover .opacity-0 {
          opacity: 1;
        }
        .opacity-0 {
          opacity: 0;
        }
        .group:focus-within .opacity-0 {
          opacity: 1;
        }
      `}</style>
    </>
  );
}