"use client";

import React, { useState } from "react";
import { useAuth } from "../app/context/AuthContext";

interface FoodSearchResult {
  name: string;
  brand?: string;
  serving_size: string;
  calories: number;
  protein_grams?: number;
  carbs_grams?: number;
  fats_grams?: number;
  barcode?: string;
  nutrition_grade?: string;
}

interface FoodSearchResponse {
  results: FoodSearchResult[];
  total_found: number;
}

export default function FoodSearchUI() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState("lunch");
  const [notes, setNotes] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a food name");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/food-search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 15,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data: FoodSearchResponse = await response.json();

      if (data.results.length === 0) {
        setError(`No foods found for "${query}". Try a different search.`);
      } else {
        setResults(data.results);
        // Add to search history
        if (!searchHistory.includes(query)) {
          setSearchHistory([query, ...searchHistory.slice(0, 9)]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const selectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setQuantity(1);
  };

  const logMeal = async () => {
    if (!selectedFood || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");

      // Calculate nutrition totals
      const calories = selectedFood.calories * quantity;
      const protein = (selectedFood.protein_grams || 0) * quantity;
      const carbs = (selectedFood.carbs_grams || 0) * quantity;
      const fat = (selectedFood.fats_grams || 0) * quantity;

      const response = await fetch(`${API_URL}/api/meals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_type: mealType,
          name: selectedFood.name,
          calories: calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
          quantity: quantity,
          source: "food_search",
          user_notes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log meal");
      }

      alert(
        `✅ Logged ${quantity} serving(s) of ${selectedFood.name} (${Math.round(calories)} cal)`
      );
      setSelectedFood(null);
      setQuery("");
      setResults([]);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        🍎 Food Database Search
      </h2>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search for food (e.g., 'apple', 'chicken breast', 'whole wheat bread')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium"
          >
            {loading ? "Searching..." : "🔍 Search"}
          </button>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && !query && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Recent searches:
            </p>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      {!selectedFood ? (
        <div className="space-y-4">
          {results.length > 0 && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Found {results.length} foods matching your search
              </p>

              {results.map((food, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition"
                  onClick={() => selectFood(food)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                        {food.name}
                      </h3>
                      {food.brand && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Brand: {food.brand}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {food.serving_size}
                      </p>
                    </div>

                    {food.nutrition_grade && (
                      <div className="ml-4 flex-shrink-0">
                        <div
                          className={`px-3 py-1 rounded-full font-bold text-white text-sm ${
                            food.nutrition_grade === "A"
                              ? "bg-green-600"
                              : food.nutrition_grade === "B"
                              ? "bg-green-500"
                              : food.nutrition_grade === "C"
                              ? "bg-yellow-500"
                              : food.nutrition_grade === "D"
                              ? "bg-orange-500"
                              : "bg-red-600"
                          }`}
                        >
                          {food.nutrition_grade}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Macro Pills */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                      {Math.round(food.calories)} cal
                    </div>
                    {food.protein_grams !== undefined && (
                      <div className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                        {food.protein_grams.toFixed(1)}g protein
                      </div>
                    )}
                    {food.carbs_grams !== undefined && (
                      <div className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm">
                        {food.carbs_grams.toFixed(1)}g carbs
                      </div>
                    )}
                    {food.fats_grams !== undefined && (
                      <div className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm">
                        {food.fats_grams.toFixed(1)}g fat
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <p className="text-lg mb-2">🔍 No results found</p>
              <p className="text-sm">Try searching for a different food item</p>
            </div>
          )}

          {!loading && results.length === 0 && !query && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <p className="text-lg mb-2">🥗 Search to get started</p>
              <p className="text-sm">Enter a food name to see nutrition data</p>
            </div>
          )}
        </div>
      ) : (
        /* Selected Food Details */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedFood(null)}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to results
          </button>

          <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-lg border-2 border-green-300 dark:border-green-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedFood.name}
            </h3>
            {selectedFood.brand && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Brand: {selectedFood.brand}
              </p>
            )}

            {/* Nutrition Facts */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(selectedFood.calories * quantity)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Calories
                </div>
              </div>
              {selectedFood.protein_grams !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(selectedFood.protein_grams * quantity).toFixed(1)}g
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Protein
                  </div>
                </div>
              )}
              {selectedFood.carbs_grams !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {(selectedFood.carbs_grams * quantity).toFixed(1)}g
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Carbs
                  </div>
                </div>
              )}
              {selectedFood.fats_grams !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {(selectedFood.fats_grams * quantity).toFixed(1)}g
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Fat
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity ({selectedFood.serving_size}):
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(0.5, parseFloat(e.target.value) || 1))
                  }
                  className="w-20 text-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 0.5))}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Meal Type */}
            <div className="mb-6">
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., medium apple, no skin..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={logMeal}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-bold"
              >
                {loading ? "Logging..." : "✅ Log Meal"}
              </button>
              <button
                onClick={() => setSelectedFood(null)}
                className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-lg hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
