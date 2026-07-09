import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find insertion point: after clearSelection function, before scaled
insert_idx = None
for i in range(len(lines)):
    if 'const clearSelection = () => {' in lines[i]:
        # Find the closing brace of clearSelection
        depth = 0
        for j in range(i, len(lines)):
            if '{' in lines[j]:
                depth += lines[j].count('{')
            if '}' in lines[j]:
                depth -= lines[j].count('}')
                if depth == 0:
                    insert_idx = j + 1
                    break
        break

if insert_idx is None:
    print("ERROR: Could not find clearSelection end")
    sys.exit(1)

handlers = '''
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
'''

lines[insert_idx:insert_idx] = [handlers]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Inserted handlers at line {insert_idx}")
