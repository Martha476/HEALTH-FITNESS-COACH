"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface SavedMeal extends Meal {
  id: string;
  date: string;
  time: string;
}

interface UserProfile {
  primaryGoal: string;
  dailyCalorieGoal: number;
}

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export default function Nutrition() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealHistory, setMealHistory] = useState<SavedMeal[]>([]);
  const [activeTab, setActiveTab] = useState("today");
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('mealHistory');
    if (savedHistory) {
      setMealHistory(JSON.parse(savedHistory));
    }

    const savedWater = localStorage.getItem('waterIntake');
    const savedDate = localStorage.getItem('waterIntakeDate');
    const today = new Date().toDateString();
    
    if (savedWater && savedDate === today) {
      setWaterGlasses(parseInt(savedWater));
    } else {
      // Reset water intake for new day
      setWaterGlasses(0);
      localStorage.setItem('waterIntake', '0');
      localStorage.setItem('waterIntakeDate', today);
    }

    const profile = localStorage.getItem('userProfile');
    if (profile) {
      setUserProfile(JSON.parse(profile));
    }
  }, []);

  // Save meal to history
  const saveMealToHistory = (meal: Meal) => {
    const savedMeal: SavedMeal = {
      ...meal,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    
    const updated = [savedMeal, ...mealHistory];
    setMealHistory(updated);
    localStorage.setItem('mealHistory', JSON.stringify(updated));
  };

  // Add water glass
  const addWaterGlass = () => {
    if (waterGlasses < 12) {
      const newCount = waterGlasses + 1;
      setWaterGlasses(newCount);
      localStorage.setItem('waterIntake', newCount.toString());
      localStorage.setItem('waterIntakeDate', new Date().toDateString());
    }
  };

  // Reset water intake
  const resetWaterIntake = () => {
    setWaterGlasses(0);
    localStorage.setItem('waterIntake', '0');
    localStorage.setItem('waterIntakeDate', new Date().toDateString());
  };

  const totalCalories = meals.reduce((sum, meal) => sum +meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFats = meals.reduce((sum, meal) => sum + meal.fats, 0);

  // Calculate daily goals from profile or defaults
  const dailyGoals = {
    calories: userProfile?.dailyCalorieGoal || 2000,
    protein: Math.round((userProfile?.dailyCalorieGoal || 2000) * 0.3 / 4),
    carbs: Math.round((userProfile?.dailyCalorieGoal || 2000) * 0.4 / 4),
    fats: Math.round((userProfile?.dailyCalorieGoal || 2000) * 0.3 / 9),
  };

  // Goal-based meal suggestions
  const getMealSuggestions = (): MealSuggestion[] => {
    const goal = userProfile?.primaryGoal || 'maintain';
    
    const suggestions: { [key: string]: MealSuggestion[] } = {
      'lose-weight': [
        { name: "Lean Protein Bowl", description: "Grilled chicken breast, quinoa, steamed broccoli, mixed greens", calories: 380, protein: 42, carbs: 35, fats: 8 },
        { name: "Greek Salad with Salmon", description: "Grilled salmon, mixed greens, cucumber, tomatoes, feta cheese", calories: 420, protein: 38, carbs: 22, fats: 18 },
        { name: "Veggie Omelette", description: "3 egg whites, spinach, mushrooms, peppers, whole grain toast", calories: 320, protein: 28, carbs: 30, fats: 10 },
        { name: "Turkey & Avocado Wrap", description: "Turkey breast, avocado, lettuce, tomato in whole wheat wrap", calories: 360, protein: 32, carbs: 35, fats: 12 }
      ],
      'build-muscle': [
        { name: "High-Protein Breakfast", description: "4 eggs, oatmeal with berries, whole wheat toast with peanut butter", calories: 680, protein: 42, carbs: 65, fats: 24 },
        { name: "Steak & Sweet Potato", description: "8oz sirloin steak, large sweet potato, green beans", calories: 720, protein: 58, carbs: 62, fats: 22 },
        { name: "Chicken & Rice Power Bowl", description: "Grilled chicken, brown rice, avocado, black beans", calories: 650, protein: 52, carbs: 68, fats: 18 },
        { name: "Salmon & Quinoa Plate", description: "Baked salmon, quinoa, roasted vegetables, olive oil drizzle", calories: 620, protein: 48, carbs: 55, fats: 20 }
      ],
      'maintain': [
        { name: "Balanced Chicken Bowl", description: "Grilled chicken, brown rice, mixed vegetables, teriyaki sauce", calories: 520, protein: 38, carbs: 52, fats: 15 },
        { name: "Mediterranean Plate", description: "Grilled fish, couscous, roasted vegetables, hummus", calories: 480, protein: 35, carbs: 48, fats: 16 },
        { name: "Protein Smoothie Bowl", description: "Protein shake, banana, berries, granola, almond butter", calories: 450, protein: 32, carbs: 50, fats: 14 },
        { name: "Pasta with Lean Meat", description: "Whole wheat pasta, lean ground turkey, marinara, vegetables", calories: 510, protein: 36, carbs: 58, fats: 13 }
      ]
    };

    return suggestions[goal] || suggestions['maintain'];
  };

  const waterTarget = 8;
  const waterPercentage = Math.min((waterGlasses / waterTarget) * 100, 100);

  const MacroBar = ({
    label,
    current,
    goal,
    color,
  }: {
    label: string;
    current: number;
    goal: number;
    color: string;
  }) => (
    <div className="bg-slate-800 rounded-xl shadow-lg p-7 border border-slate-700">
      <div className="flex justify-between mb-2">
        <span className="font-semibold text-slate-100">{label}</span>
        <span className="text-slate-400">
          {current}g / {goal}g
        </span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${Math.min((current / goal) * 100, 100)}%` }}
        ></div>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        {Math.round((current / goal) * 100)}% of daily goal
      </p>
    </div>
  );

  const hasNoGoals = dailyGoals.calories === 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-14 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-slate-100">🥗 Nutrition Planner</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Track your meals and manage your macronutrients
        </p>
      </div>

      {/* Hero Image Section */}
      <div className="mb-10 rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
        <div className="overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80"
            alt="Healthy meal preparation with fresh vegetables and fruits"
            className="w-full h-64 md:h-80 object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="bg-slate-800 p-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Fuel Your Body Right 🥙
          </h2>
          <p className="text-slate-300 text-sm md:text-base mb-4">
            Plan balanced meals, track macros, and achieve your nutrition goals
          </p>
          <button 
            onClick={() => setActiveTab("suggestions")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg"
          >
            Explore 🔍
          </button>
        </div>
      </div>

      {/* Goal Setup Prompt */}
      {hasNoGoals && (
        <div className="mb-8 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-l-4 border-amber-500 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <h3 className="text-base font-bold text-amber-300 mb-1">Set Your Daily Nutrition Goals</h3>
              <p className="text-sm text-slate-300">Go to Settings to configure your daily calorie and macro targets based on your fitness goals.</p>
            </div>
          </div>
        </div>
      )}

      {/* Water Intake Tracker */}
      <div className="mb-10 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-3xl shadow-lg p-8 border border-blue-700/50 hover:shadow-2xl transition-shadow duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span>💧</span> Water Intake
            </h2>
            <p className="text-slate-300 mb-6">Stay hydrated throughout your day. Track your water consumption to maintain optimal performance.</p>
            <div className="flex gap-4 mb-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2">
                <span>💧</span> Log Glass
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                Reset
              </button>
            </div>
            <div className="bg-slate-800/70 rounded-xl p-5 border border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-slate-300 font-semibold">Today's Progress</span>
                <span className="text-blue-400 font-bold">6 / 8 glasses</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-3">
                <div className="h-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{width: '75%'}}></div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Target: 2L (8 glasses) per day</p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-64 h-80 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&auto=format&fit=crop&q=80"
                alt="Water pouring into glass"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-center">
                <p className="text-3xl font-bold text-white drop-shadow-lg">💧 Water</p>
                <p className="text-lg text-blue-100 drop-shadow-lg">☀️ stay hydrated.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700">
          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">Calories</p>
            <p className="text-4xl font-bold text-amber-500 mt-2">{totalCalories}</p>
            <p className="text-slate-400 text-sm mt-1">
              / {dailyGoals.calories} kcal
            </p>
            <div className="mt-3 w-full h-2 bg-slate-600 rounded-full">
              <div
                className="h-2 bg-amber-500 rounded-full"
                style={{
                  width: `${Math.min((totalCalories / dailyGoals.calories) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700">
          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">Protein</p>
            <p className="text-4xl font-bold text-red-500 mt-2">{totalProtein}g</p>
            <p className="text-slate-400 text-sm mt-1">
              / {dailyGoals.protein}g
            </p>
            <div className="mt-3 w-full h-2 bg-slate-600 rounded-full">
              <div
                className="h-2 bg-red-500 rounded-full"
                style={{
                  width: `${Math.min((totalProtein / dailyGoals.protein) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700">
          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">Carbs</p>
            <p className="text-4xl font-bold text-blue-500 mt-2">{totalCarbs}g</p>
            <p className="text-slate-400 text-sm mt-1">
              / {dailyGoals.carbs}g
            </p>
            <div className="mt-3 w-full h-2 bg-slate-600 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{
                  width: `${Math.min((totalCarbs / dailyGoals.carbs) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700">
          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">Fats</p>
            <p className="text-4xl font-bold text-yellow-500 mt-2">{totalFats}g</p>
            <p className="text-slate-400 text-sm mt-1">
              / {dailyGoals.fats}g
            </p>
            <div className="mt-3 w-full h-2 bg-slate-600 rounded-full">
              <div
                className="h-2 bg-yellow-500 rounded-full"
                style={{
                  width: `${Math.min((totalFats / dailyGoals.fats) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("today")}
          className={`px-4 py-3 font-semibold text-base ${
            activeTab === "today"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Today's Meals
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`px-4 py-3 font-semibold text-base ${
            activeTab === "suggestions"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          AI Suggestions
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-3 font-semibold text-base ${
            activeTab === "history"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          History
        </button>
      </div>

      {activeTab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Meals List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
              <div className="p-8 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-slate-100">Today's Meals</h2>
              </div>
              <div className="divide-y divide-slate-700">
                {meals.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="text-6xl mb-6">🍽️</div>
                    <p className="text-slate-400 text-lg">No meals logged today</p>
                    <p className="text-slate-500 text-sm mt-2">Use the form to log your first meal</p>
                  </div>
                ) : (
                  meals.map((meal, idx) => (
                    <div key={idx} className="p-6 px-8 flex items-center justify-between hover:bg-slate-700/50">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-100">{meal.name}</p>
                        <p className="text-sm text-slate-400">
                          P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">{meal.calories} kcal</p>
                        <button 
                          onClick={() => {
                            setMeals(meals.filter((_, i) => i !== idx));
                          }}
                          className="text-red-500 text-sm hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Log Meal Form */}
          <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700 hover:shadow-2xl transition-shadow duration-300">
            <div className="rounded-xl overflow-hidden mb-4 h-40">
              <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80" alt="Healthy meal" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-4">🍽️ Log Meal</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Meal name"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Calories"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button 
                onClick={() => {
                  if (mealName && calories) {
                    const newMeal: Meal = {
                      name: mealName,
                      calories: parseInt(calories),
                      protein: Math.round(parseInt(calories) * 0.3 / 4),
                      carbs: Math.round(parseInt(calories) * 0.4 / 4),
                      fats: Math.round(parseInt(calories) * 0.3 / 9),
                    };
                    setMeals([...meals, newMeal]);
                    setMealName("");
                    setCalories("");
                  } else {
                    alert("Please enter meal name and calories");
                  }
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Log Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "suggestions" && (
        <div>
          {/* Healthy Bowl Hero Image */}
          <div className="mb-8 rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
            <div className="overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80"
                alt="Colorful healthy bowls with vegetables and smoothie"
                className="w-full h-64 md:h-72 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="bg-slate-800 p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Fresh & Nutritious Meal Ideas 🥗
              </h2>
              <p className="text-slate-300 text-sm md:text-base">
                Discover delicious, balanced meals tailored to your dietary preferences
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700">
              <h3 className="font-bold text-lg text-slate-100 mb-2">
                Protein-Packed Breakfast
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                4 eggs, oatmeal with berries, whole wheat toast
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm mb-4">
                <div>
                  <p className="text-orange-500 font-bold">480</p>
                  <p className="text-slate-400 text-xs">kcal</p>
                </div>
                <div>
                  <p className="text-red-500 font-bold">35g</p>
                  <p className="text-slate-400 text-xs">protein</p>
                </div>
                <div>
                  <p className="text-blue-500 font-bold">45g</p>
                  <p className="text-slate-400 text-xs">carbs</p>
                </div>
                <div>
                  <p className="text-yellow-500 font-bold">15g</p>
                  <p className="text-slate-400 text-xs">fats</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const suggestedMeal: Meal = {
                    name: "Protein-Packed Breakfast",
                    calories: 480,
                    protein: 35,
                    carbs: 45,
                    fats: 15,
                  };
                  setMeals([...meals, suggestedMeal]);
                  setActiveTab("today");
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Add to Today
              </button>
            </div>
          ))}
        </div>        </div>      )}

      {activeTab === "history" && (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
          <div className="p-8 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-slate-100">Meal History</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="p-6 px-8 flex items-center justify-between hover:bg-slate-700/50"
              >
                <div>
                  <p className="font-semibold text-slate-100">
                    Chicken & Rice Bowl
                  </p>
                  <p className="text-sm text-slate-400">
                    March {10 - item}, 2025 • {1700 + item * 100} kcal
                  </p>
                </div>
                <button 
                  onClick={() => alert(`Meal details for March ${10 - item}, 2025`)}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

