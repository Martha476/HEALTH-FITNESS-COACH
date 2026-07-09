import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the pattern: "            </h3>\n\n            {/* Search input */}"
insert_idx = None
for i in range(len(lines) - 2):
    if ('</h3>' in lines[i] and 
        i+1 < len(lines) and lines[i+1].strip() == '' and
        i+2 < len(lines) and 'Search input' in lines[i+2]):
        insert_idx = i + 2  # before the search comment
        break

if insert_idx is None:
    print("ERROR: Could not find insertion point")
    sys.exit(1)

photo_jsx = '''            {/* Photo upload section */
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

'''

lines[insert_idx:insert_idx] = [photo_jsx]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Inserted photo upload section at line {insert_idx}")
