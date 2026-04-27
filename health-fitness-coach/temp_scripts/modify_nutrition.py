import re

# Paths
file_path = "frontend/app/nutrition/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update import to include ChangeEvent
old_import = 'import { useState, useEffect, useRef } from "react";'
new_import = 'import { useState, useEffect, useRef, ChangeEvent } from "react";'
if old_import not in content:
    raise ValueError("Import line not found")
content = content.replace(old_import, new_import, 1)

# 2. Add photo analysis state after logSuccess state
state_insert = """
  // Photo analysis state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");
"""
log_success_line = "const [logSuccess,    setLogSuccess]    = useState(false);"
if log_success_line not in content:
    raise ValueError("logSuccess line not found")
content = content.replace(log_success_line, log_success_line + state_insert, 1)

# 3. Insert photo upload JSX after h3 and before search input
old_pattern = "            </h3>\n\n            {/* Search input */}"
photo_jsx = """            {/* Photo upload section */
            const photoUpload = (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">📷 Log Meal from Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="block w-full text-sm text-slate-400 mb-2 cursor-pointer"
              />
              {imagePreview && (
                <div className="mb-2">
                  <img src={imagePreview} alt="Meal preview" className="max-h-48 rounded-lg border border-slate-600 object-cover" />
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
                <div className="mt-2 bg-slate-700/50 border border-slate-600 rounded-xl p-3">
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
                    ].map((m, i) => (
                      <div key={i} className="bg-slate-800 rounded-lg py-2 border border-slate-600">
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
            {/* End photo upload section */"""
if old_pattern not in content:
    raise ValueError("Pattern before search input not found")
content = content.replace(old_pattern, "            </h3>\n\n" + photo_jsx + "\n            {/* Search input */}", 1)

# 4. Insert handler functions after resetWater closing
old_handler_point = "   };\n\n   const totalCalories = meals.reduce((s, m) => s + m.calories, 0);"
handlers = """  // Photo analysis handlers
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
"""
if old_handler_point not in content:
    raise ValueError("Handler insertion point not found")
content = content.replace(old_handler_point, "   };\n\n" + handlers + "\n   const totalCalories = meals.reduce((s, m) => s + m.calories, 0);", 1)

# Write out
out_path = "frontend/app/nutrition/page_new.tsx"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Modified file written successfully to", out_path)
