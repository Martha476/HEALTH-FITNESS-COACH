"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Macros {
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
}

interface FoodResult extends Macros {
  name:       string;
  serving:    string;
  confidence: "exact" | "estimated";
}

interface LoggedMeal extends Macros {
  id:       string;
  name:     string;
  servings: number;
  time:     string;
  source:   "search" | "photo";
}

// ── Common foods dictionary ────────────────────────────────────────────────────
const COMMON_FOODS: Record<string, FoodResult> = {
  "banana":         { name: "Banana (medium)",          calories: 89,  protein: 1.1, carbs: 23,  fat: 0.3,  serving: "118g",    confidence: "exact" },
  "egg":            { name: "Boiled Egg",                calories: 78,  protein: 6.3, carbs: 0.6, fat: 5.3,  serving: "50g",     confidence: "exact" },
  "eggs":           { name: "Boiled Egg",                calories: 78,  protein: 6.3, carbs: 0.6, fat: 5.3,  serving: "50g",     confidence: "exact" },
  "rice":           { name: "White Rice (cooked)",       calories: 130, protein: 2.7, carbs: 28,  fat: 0.3,  serving: "100g",    confidence: "exact" },
  "brown rice":     { name: "Brown Rice (cooked)",       calories: 112, protein: 2.6, carbs: 24,  fat: 0.9,  serving: "100g",    confidence: "exact" },
  "chicken breast": { name: "Chicken Breast (grilled)",  calories: 165, protein: 31,  carbs: 0,   fat: 3.6,  serving: "100g",    confidence: "exact" },
  "chicken":        { name: "Chicken Breast (grilled)",  calories: 165, protein: 31,  carbs: 0,   fat: 3.6,  serving: "100g",    confidence: "exact" },
  "oats":           { name: "Rolled Oats (dry)",         calories: 389, protein: 17,  carbs: 66,  fat: 7,    serving: "100g",    confidence: "exact" },
  "oatmeal":        { name: "Oatmeal (cooked)",          calories: 71,  protein: 2.5, carbs: 12,  fat: 1.5,  serving: "100g",    confidence: "exact" },
  "bread":          { name: "Whole Wheat Bread",         calories: 247, protein: 13,  carbs: 41,  fat: 3.4,  serving: "100g",    confidence: "exact" },
  "milk":           { name: "Whole Milk",                calories: 61,  protein: 3.2, carbs: 4.8, fat: 3.3,  serving: "100ml",   confidence: "exact" },
  "salmon":         { name: "Salmon (grilled)",          calories: 208, protein: 20,  carbs: 0,   fat: 13,   serving: "100g",    confidence: "exact" },
  "tuna":           { name: "Tuna (canned in water)",    calories: 116, protein: 26,  carbs: 0,   fat: 1,    serving: "100g",    confidence: "exact" },
  "apple":          { name: "Apple (medium)",            calories: 52,  protein: 0.3, carbs: 14,  fat: 0.2,  serving: "182g",    confidence: "exact" },
  "avocado":        { name: "Avocado (half)",            calories: 160, protein: 2,   carbs: 9,   fat: 15,   serving: "100g",    confidence: "exact" },
  "sweet potato":   { name: "Sweet Potato (baked)",      calories: 103, protein: 2.3, carbs: 24,  fat: 0.1,  serving: "150g",    confidence: "exact" },
  "broccoli":       { name: "Broccoli (steamed)",        calories: 35,  protein: 2.4, carbs: 7,   fat: 0.4,  serving: "100g",    confidence: "exact" },
  "pasta":          { name: "Pasta (cooked)",            calories: 158, protein: 5.8, carbs: 31,  fat: 0.9,  serving: "100g",    confidence: "exact" },
  "yogurt":         { name: "Greek Yogurt (plain)",      calories: 59,  protein: 10,  carbs: 3.6, fat: 0.4,  serving: "100g",    confidence: "exact" },
  "peanut butter":  { name: "Peanut Butter",             calories: 588, protein: 25,  carbs: 20,  fat: 50,   serving: "100g",    confidence: "exact" },
  "almonds":        { name: "Almonds",                   calories: 579, protein: 21,  carbs: 22,  fat: 50,   serving: "100g",    confidence: "exact" },
  "beef":           { name: "Beef (lean, cooked)",       calories: 217, protein: 26,  carbs: 0,   fat: 12,   serving: "100g",    confidence: "exact" },
  "quinoa":         { name: "Quinoa (cooked)",           calories: 120, protein: 4.4, carbs: 22,  fat: 1.9,  serving: "100g",    confidence: "exact" },
  "lentils":        { name: "Lentils (cooked)",          calories: 116, protein: 9,   carbs: 20,  fat: 0.4,  serving: "100g",    confidence: "exact" },
  "orange":         { name: "Orange (medium)",           calories: 62,  protein: 1.2, carbs: 15,  fat: 0.2,  serving: "131g",    confidence: "exact" },
  "spinach":        { name: "Spinach (raw)",             calories: 23,  protein: 2.9, carbs: 3.6, fat: 0.4,  serving: "100g",    confidence: "exact" },
  "cheese":         { name: "Cheddar Cheese",            calories: 402, protein: 25,  carbs: 1.3, fat: 33,   serving: "100g",    confidence: "exact" },
  "pizza":          { name: "Pizza (cheese, 1 slice)",   calories: 272, protein: 12,  carbs: 34,  fat: 10,   serving: "107g",    confidence: "estimated" },
  "burger":         { name: "Beef Burger",               calories: 354, protein: 20,  carbs: 29,  fat: 17,   serving: "150g",    confidence: "estimated" },
  "coffee":         { name: "Black Coffee",              calories: 2,   protein: 0.3, carbs: 0,   fat: 0,    serving: "240ml",   confidence: "exact" },
  "protein shake":  { name: "Protein Shake (whey)",      calories: 120, protein: 25,  carbs: 5,   fat: 2,    serving: "1 scoop", confidence: "estimated" },
  "chapati":        { name: "Chapati / Roti",            calories: 120, protein: 3.1, carbs: 18,  fat: 3.7,  serving: "40g",     confidence: "estimated" },
  "ugali":          { name: "Ugali (maize porridge)",    calories: 145, protein: 1.2, carbs: 32,  fat: 0.4,  serving: "100g",    confidence: "estimated" },
  "beans":          { name: "Kidney Beans (cooked)",     calories: 127, protein: 8.7, carbs: 23,  fat: 0.5,  serving: "100g",    confidence: "exact" },
  "mango":          { name: "Mango (medium)",            calories: 201, protein: 2.8, carbs: 50,  fat: 1.3,  serving: "336g",    confidence: "exact" },
};

function searchCommon(query: string): FoodResult[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return Object.entries(COMMON_FOODS)
    .filter(([key]) => key.includes(q) || q.includes(key))
    .map(([, v]) => v)
    .slice(0, 6);
}

async function searchOpenFoodFacts(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,serving_size`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.products?.length) return [];
    return data.products
      .filter((p: any) => p.product_name && p.nutriments?.["energy-kcal_100g"])
      .slice(0, 5)
      .map((p: any) => ({
        name:       p.product_name,
        calories:   Math.round(p.nutriments["energy-kcal_100g"] || 0),
        protein:    Math.round((p.nutriments["proteins_100g"] || 0) * 10) / 10,
        carbs:      Math.round((p.nutriments["carbohydrates_100g"] || 0) * 10) / 10,
        fat:        Math.round((p.nutriments["fat_100g"] || 0) * 10) / 10,
        serving:    p.serving_size || "per 100g",
        confidence: "exact" as const,
      }));
  } catch { return []; }
}

// ── Macro Ring SVG ────────────────────────────────────────────────────────────
function MacroRing({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const r = 28, cx = 32, cy = 32, stroke = 5;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="32" y="37" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">
          {value}g
        </text>
      </svg>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MealLogger({ onMealLogged }: { onMealLogged?: (meal: LoggedMeal) => void }) {
  const [tab, setTab]               = useState<"search" | "photo">("search");
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<FoodResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [selected, setSelected]     = useState<FoodResult | null>(null);
  const [servings, setServings]     = useState(1);
  const [mealType, setMealType]     = useState("lunch");
  const [showDrop, setShowDrop]     = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [meals, setMeals]           = useState<LoggedMeal[]>([]);

  // Photo tab
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [analyzing,    setAnalyzing]    = useState(false);
  const [photoResult,  setPhotoResult]  = useState<FoodResult | null>(null);
  const [photoError,   setPhotoError]   = useState("");

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Totals
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fat:      acc.fat      + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const scaled = selected
    ? {
        calories: Math.round(selected.calories * servings),
        protein:  Math.round(selected.protein  * servings * 10) / 10,
        carbs:    Math.round(selected.carbs    * servings * 10) / 10,
        fat:      Math.round(selected.fat      * servings * 10) / 10,
      }
    : null;

  // Search effect
  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDrop(false); return; }
    if (debounce.current) clearTimeout(debounce.current);

    const instant = searchCommon(query);
    if (instant.length) { setResults(instant); setShowDrop(true); return; }

    debounce.current = setTimeout(async () => {
      setSearching(true);
      const found = await searchOpenFoodFacts(query);
      setResults(found); setShowDrop(found.length > 0); setSearching(false);
    }, 600);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const selectFood = (food: FoodResult) => {
    setSelected(food); setQuery(food.name); setShowDrop(false); setServings(1);
  };

  const clearSearch = () => {
    setSelected(null); setQuery(""); setResults([]); setShowDrop(false);
    setServings(1); setLogSuccess(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const logMeal = (food: FoodResult, s: number, source: "search" | "photo") => {
    const macros = {
      calories: Math.round(food.calories * s),
      protein:  Math.round(food.protein  * s * 10) / 10,
      carbs:    Math.round(food.carbs    * s * 10) / 10,
      fat:      Math.round(food.fat      * s * 10) / 10,
    };
    const meal: LoggedMeal = {
      id:       Date.now().toString(),
      name:     s !== 1 ? `${food.name} (×${s})` : food.name,
      servings: s,
      time:     new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      source,
      ...macros,
    };
    setMeals(p => [meal, ...p]);
    onMealLogged?.(meal);
    setLogSuccess(true);
    setTimeout(() => { clearSearch(); setLogSuccess(false); }, 1800);
  };

  // Photo handlers
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImageFile(file); setPhotoResult(null); setPhotoError("");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async () => {
    if (!imageFile) return;
    setAnalyzing(true); setPhotoError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const form  = new FormData();
      form.append("file", imageFile);
      form.append("meal_type", mealType);

      const res = await fetch("/api/nutrition/meals/analyze-image", {
        method: "POST",
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        const a    = data.analysis;
        setPhotoResult({
          name:       a.food_name,
          calories:   Math.round(a.calories),
          protein:    Math.round(a.protein_g * 10) / 10,
          carbs:      Math.round(a.carbs_g   * 10) / 10,
          fat:        Math.round(a.fat_g     * 10) / 10,
          serving:    a.portion_estimate || "1 serving",
          confidence: a.confidence > 0.6 ? "exact" : "estimated",
        });
      } else {
        // Fallback estimate
        setPhotoResult({
          name: imageFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          calories: 420, protein: 22, carbs: 45, fat: 14,
          serving: "1 serving", confidence: "estimated",
        });
      }
    } catch {
      setPhotoError("Could not analyse photo. Using estimate.");
      setPhotoResult({
        name: "Mixed Meal", calories: 450, protein: 25, carbs: 48, fat: 16,
        serving: "1 serving", confidence: "estimated",
      });
    } finally { setAnalyzing(false); }
  };

  const DAILY_GOAL = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

  return (
    <div className="w-full max-w-xl mx-auto font-sans">
      {/* ── Daily totals bar ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-700">Today's Nutrition</span>
          <span className="text-xs text-teal-600 font-semibold">{totals.calories} / {DAILY_GOAL.calories} kcal</span>
        </div>

        {/* Calorie bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((totals.calories / DAILY_GOAL.calories) * 100, 100)}%`,
              background: "linear-gradient(90deg, #14b8a6, #06b6d4)",
            }}
          />
        </div>

        {/* Macro rings */}
        <div className="grid grid-cols-3 gap-2">
          <MacroRing value={totals.protein} total={DAILY_GOAL.protein} color="#ef4444" label="Protein" />
          <MacroRing value={totals.carbs}   total={DAILY_GOAL.carbs}   color="#3b82f6" label="Carbs"   />
          <MacroRing value={totals.fat}     total={DAILY_GOAL.fat}     color="#f59e0b" label="Fat"     />
        </div>
      </div>

      {/* ── Log Meal card ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              🔍 Log Meal
            </h3>
            <span className="text-xs text-gray-400">auto-calculates macros</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-3">
            {(["search", "photo"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); clearSearch(); setPhotoResult(null); setImagePreview(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {t === "search" ? "🔎 Search Food" : "📷 Photo Detect"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">

          {/* ── SEARCH TAB ──────────────────────────────────────────────── */}
          {tab === "search" && (
            <>
              {/* Meal type */}
              <div className="flex gap-2">
                {[["🌅","breakfast"],["☀️","lunch"],["🌙","dinner"],["🍎","snack"]].map(([icon, type]) => (
                  <button key={type} onClick={() => setMealType(type)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      mealType === type
                        ? "bg-teal-50 border-teal-400 text-teal-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <input ref={inputRef} type="text" value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(null); setLogSuccess(false); }}
                  onFocus={() => results.length > 0 && !selected && setShowDrop(true)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                  placeholder="e.g. banana, chicken breast, oats..."
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                />
                {searching && (
                  <div className="absolute right-3 top-3.5">
                    <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
                  </div>
                )}
                {selected && !searching && (
                  <button onClick={clearSearch} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-sm">✕</button>
                )}

                {/* Dropdown */}
                {showDrop && results.length > 0 && !selected && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                    {results.map((food, i) => (
                      <button key={i} onMouseDown={() => selectFood(food)}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-gray-100 last:border-0 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{food.name}</p>
                            <p className="text-xs text-gray-400">{food.serving}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-orange-500">{food.calories} kcal</p>
                            <p className="text-xs text-gray-400">P{food.protein}g C{food.carbs}g F{food.fat}g</p>
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

              {/* Selected food preview */}
              {selected && scaled && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{selected.name}</p>
                      <p className="text-xs text-gray-500">{selected.serving} per serving</p>
                    </div>
                    {selected.confidence === "exact" && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">✓ verified</span>
                    )}
                  </div>

                  {/* Servings control */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-500 font-medium">Servings:</span>
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1">
                      <button onClick={() => setServings(s => Math.max(0.5, s - 0.5))}
                        className="text-gray-400 hover:text-gray-700 font-bold text-sm w-4">−</button>
                      <span className="text-sm font-bold text-gray-800 min-w-[2rem] text-center">{servings}</span>
                      <button onClick={() => setServings(s => s + 0.5)}
                        className="text-gray-400 hover:text-gray-700 font-bold text-sm w-4">+</button>
                    </div>
                  </div>

                  {/* Macro grid */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { val: scaled.calories, label: "kcal",    color: "text-orange-500" },
                      { val: scaled.protein,  label: "protein", color: "text-red-500"    },
                      { val: scaled.carbs,    label: "carbs",   color: "text-blue-500"   },
                      { val: scaled.fat,      label: "fat",     color: "text-yellow-600" },
                    ].map(m => (
                      <div key={m.label} className="bg-white rounded-xl py-2 border border-gray-100">
                        <p className={`text-sm font-bold ${m.color}`}>{m.val}{m.label !== "kcal" ? "g" : ""}</p>
                        <p className="text-xs text-gray-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Log button */}
              <button
                onClick={() => selected && logMeal(selected, servings, "search")}
                disabled={!selected || logSuccess}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  logSuccess
                    ? "bg-green-500 text-white"
                    : selected
                    ? "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {logSuccess
                  ? "✓ Added to today!"
                  : selected
                  ? `Add ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} to Log`
                  : "Search for a food above"}
              </button>

              {!selected && (
                <p className="text-xs text-center text-gray-400">
                  Try: "banana", "chicken", "oats", "ugali", "chapati"
                </p>
              )}
            </>
          )}

          {/* ── PHOTO TAB ───────────────────────────────────────────────── */}
          {tab === "photo" && (
            <>
              <p className="text-xs text-teal-600 font-semibold text-center py-1">
                ✨ Upload any food photo — AI detects meal and calculates macros automatically
              </p>

              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-teal-300 rounded-xl p-6 cursor-pointer hover:bg-teal-50 transition-colors">
                {imagePreview
                  ? <img src={imagePreview} alt="Meal" className="max-h-40 rounded-xl object-cover w-full" />
                  : <>
                      <span className="text-4xl">📷</span>
                      <span className="text-sm font-semibold text-gray-600">Tap to upload food photo</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WEBP supported</span>
                    </>
                }
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>

              {imageFile && !analyzing && !photoResult && (
                <button onClick={analyzePhoto}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md shadow-teal-200 transition-all">
                  🔍 Detect Meal & Calculate Macros
                </button>
              )}

              {analyzing && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="animate-spin h-8 w-8 border-3 border-teal-500 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-500">Analysing your meal...</p>
                </div>
              )}

              {photoError && <p className="text-xs text-amber-600 text-center">{photoError}</p>}

              {photoResult && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-gray-800 capitalize">{photoResult.name}</p>
                      <p className="text-xs text-gray-500">{photoResult.serving}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      photoResult.confidence === "exact"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {photoResult.confidence === "exact" ? "✓ detected" : "~ estimated"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { val: photoResult.calories, label: "kcal",    color: "text-orange-500" },
                      { val: photoResult.protein,  label: "protein", color: "text-red-500"    },
                      { val: photoResult.carbs,    label: "carbs",   color: "text-blue-500"   },
                      { val: photoResult.fat,      label: "fat",     color: "text-yellow-600" },
                    ].map(m => (
                      <div key={m.label} className="bg-white rounded-xl py-2 border border-gray-100">
                        <p className={`text-sm font-bold ${m.color}`}>{m.val}{m.label !== "kcal" ? "g" : ""}</p>
                        <p className="text-xs text-gray-400">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { logMeal(photoResult, 1, "photo"); setImageFile(null); setImagePreview(""); setPhotoResult(null); }}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-all">
                    Add to Today's Log
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Logged meals list ─────────────────────────────────────────────── */}
      {meals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">Today's Meals</h3>
            <span className="text-xs text-gray-400">{meals.length} logged</span>
          </div>
          <div className="divide-y divide-gray-50">
            {meals.map(meal => (
              <div key={meal.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{meal.name}</p>
                  <p className="text-xs text-gray-400">
                    {meal.time} · P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                    {meal.source === "photo" && <span className="ml-1 text-teal-500">📷</span>}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-bold text-orange-500">{meal.calories} kcal</p>
                  <button onClick={() => setMeals(p => p.filter(m => m.id !== meal.id))}
                    className="text-xs text-red-400 hover:text-red-600">remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-600">Total</span>
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-orange-500">{totals.calories} kcal</span>
              <span className="text-red-500">P {totals.protein}g</span>
              <span className="text-blue-500">C {totals.carbs}g</span>
              <span className="text-yellow-600">F {totals.fat}g</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}