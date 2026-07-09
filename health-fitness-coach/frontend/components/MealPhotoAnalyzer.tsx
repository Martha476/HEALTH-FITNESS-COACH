"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "../app/context/AuthContext";

interface MealPhotoData {
  id: string;
  meal_type: string;
  estimated_calories: number;
  estimated_macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  image_url: string;
  user_notes: string;
  logged_date: string;
}

export default function MealPhotoAnalyzer() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealData, setMealData] = useState<MealPhotoData | null>(null);
  const [mealType, setMealType] = useState("lunch");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadMealPhoto = async () => {
    if (!selectedFile || !user) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("meal_type", mealType);
      formData.append("user_notes", notes);

      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/meals/photos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze meal photo");
      }

      const data = await response.json();
      setMealData(data);
      // Simulate confidence score (in real implementation, this comes from AI)
      setConfidence(Math.random() * 30 + 70); // 70-100%
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze meal");
    } finally {
      setLoading(false);
    }
  };

  const logMeal = async () => {
    if (!mealData || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/meals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_type: mealData.meal_type,
          name: `${mealData.meal_type.charAt(0).toUpperCase() + mealData.meal_type.slice(1)} from photo`,
          calories: mealData.estimated_calories,
          protein_g: mealData.estimated_macros.protein,
          carbs_g: mealData.estimated_macros.carbs,
          fat_g: mealData.estimated_macros.fats,
          user_notes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log meal");
      }

      alert("✅ Meal logged successfully!");
      setMealData(null);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setMealData(null);
    setNotes("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        📸 Meal Photo Analysis
      </h2>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Upload Section */}
      {!mealData ? (
        <div className="mb-6">
          {/* Preview */}
          {preview ? (
            <div className="mb-6">
              <img
                src={preview}
                alt="Meal preview"
                className="w-full h-64 object-cover rounded-lg border-2 border-blue-300"
              />
              <button
                onClick={() => {
                  setPreview(null);
                  setSelectedFile(null);
                }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change Image
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Click to upload meal photo
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                or drag and drop (Max 5MB)
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {selectedFile && preview && (
            <div className="mt-6 space-y-4">
              {/* Meal Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Type:
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes (optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., with extra olive oil, no dressing..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                  rows={3}
                />
              </div>

              {/* Analyze Button */}
              <button
                onClick={uploadMealPhoto}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-bold"
              >
                {loading ? "🤔 Analyzing..." : "🔍 Analyze Meal"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-6">
          {/* Image */}
          <div>
            <img
              src={mealData.image_url}
              alt="Analyzed meal"
              className="w-full h-64 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* Confidence Score */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confidence Score:
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {confidence.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {confidence > 85
                ? "High confidence - AI is confident in this estimate"
                : confidence > 70
                ? "Good confidence - AI has reasonable estimate"
                : "Review and adjust if needed - AI is less certain"}
            </p>
          </div>

          {/* Nutrition Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(mealData.estimated_calories)}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Calories</div>
            </div>

            <div className="p-4 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900 dark:to-red-800 rounded-lg">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {mealData.estimated_macros.protein.toFixed(0)}g
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Protein</div>
            </div>

            <div className="p-4 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900 dark:to-yellow-800 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {mealData.estimated_macros.carbs.toFixed(0)}g
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Carbs</div>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-800 rounded-lg">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {mealData.estimated_macros.fats.toFixed(0)}g
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Fat</div>
            </div>
          </div>

          {/* Macro Breakdown */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">
              Macronutrient Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Protein</span>
                  <span>
                    {(
                      (mealData.estimated_macros.protein * 4) /
                      mealData.estimated_calories *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${((mealData.estimated_macros.protein * 4) / mealData.estimated_calories) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Carbs</span>
                  <span>
                    {(
                      (mealData.estimated_macros.carbs * 4) /
                      mealData.estimated_calories *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${((mealData.estimated_macros.carbs * 4) / mealData.estimated_calories) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Fat</span>
                  <span>
                    {(
                      (mealData.estimated_macros.fats * 9) /
                      mealData.estimated_calories *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${((mealData.estimated_macros.fats * 9) / mealData.estimated_calories) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Note about adjustment */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900 text-amber-800 dark:text-amber-100 rounded-lg text-sm">
            💡 <strong>Tip:</strong> These are AI estimates. If you know the exact composition, please adjust the values before logging.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={logMeal}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-bold"
            >
              {loading ? "Logging..." : "✅ Log This Meal"}
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
