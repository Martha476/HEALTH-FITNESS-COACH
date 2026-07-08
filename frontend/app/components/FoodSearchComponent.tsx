/**
 * Food Search Component
 * Search OpenFoodFacts database for food nutrition information
 */

'use client';

import React, { useState } from 'react';

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

export default function FoodSearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      const res = await fetch('/api/food-search/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, limit: 10 }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      } else {
        setError('Failed to search foods');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSearch = async (barcode: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      const res = await fetch(`/api/food-search/search-by-barcode?barcode=${barcode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedFood(data.results[0]);
      } else if (res.status === 404) {
        setError('Product not found in database');
      } else {
        setError('Failed to search by barcode');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Barcode search failed');
    } finally {
      setLoading(false);
    }
  };

  const loadPopularFoods = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const res = await fetch('/api/food-search/popular-foods?category=common', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (err) {
      setError('Failed to load popular foods');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">🔍 Food Database Search</h2>
        <p className="text-gray-600">Search for foods and get instant nutrition info</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for food (e.g., 'chicken breast', 'brown rice')"
            className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadPopularFoods}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
          >
            Show Popular Foods
          </button>
          <button
            type="button"
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            📸 Scan Barcode
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Selected Food Detail */}
      {selectedFood && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold">{selectedFood.name}</h3>
              {selectedFood.brand && <p className="text-gray-600">{selectedFood.brand}</p>}
              <p className="text-sm text-gray-500">Per {selectedFood.serving_size}</p>
            </div>
            {selectedFood.nutrition_grade && (
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-3xl font-bold text-green-600">{selectedFood.nutrition_grade}</p>
                <p className="text-xs text-gray-600">Nutrition Grade</p>
              </div>
            )}
          </div>

          {/* Nutrition Facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{selectedFood.calories.toFixed(0)}</p>
              <p className="text-sm text-gray-600">Calories</p>
            </div>
            {selectedFood.protein_grams && (
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{selectedFood.protein_grams.toFixed(1)}g</p>
                <p className="text-sm text-gray-600">Protein</p>
              </div>
            )}
            {selectedFood.carbs_grams && (
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{selectedFood.carbs_grams.toFixed(1)}g</p>
                <p className="text-sm text-gray-600">Carbs</p>
              </div>
            )}
            {selectedFood.fats_grams && (
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{selectedFood.fats_grams.toFixed(1)}g</p>
                <p className="text-sm text-gray-600">Fats</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition">
              ➕ Add to Meal
            </button>
            <button
              onClick={() => setSelectedFood(null)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && !selectedFood && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Found {results.length} results</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((food, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedFood(food)}
                className="bg-white rounded-lg shadow hover:shadow-lg p-4 cursor-pointer transition"
              >
                <h4 className="font-semibold text-gray-900">{food.name}</h4>
                {food.brand && <p className="text-sm text-gray-600">{food.brand}</p>}
                <p className="text-xs text-gray-500 mb-3">{food.serving_size}</p>

                <div className="flex gap-2 justify-between">
                  <div>
                    <p className="text-lg font-bold text-orange-600">{food.calories.toFixed(0)}</p>
                    <p className="text-xs text-gray-600">cal</p>
                  </div>
                  {food.protein_grams && (
                    <div>
                      <p className="text-lg font-bold text-red-600">{food.protein_grams.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">g protein</p>
                    </div>
                  )}
                  {food.carbs_grams && (
                    <div>
                      <p className="text-lg font-bold text-yellow-600">{food.carbs_grams.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">g carbs</p>
                    </div>
                  )}
                  {food.fats_grams && (
                    <div>
                      <p className="text-lg font-bold text-amber-600">{food.fats_grams.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">g fats</p>
                    </div>
                  )}
                </div>

                {food.nutrition_grade && (
                  <p className="text-xs text-gray-500 mt-2">Grade: {food.nutrition_grade}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          💡 <strong>Info:</strong> This uses the OpenFoodFacts database which contains over 800,000 foods worldwide.
          Search for specific foods or use the barcode scanner on your phone!
        </p>
      </div>
    </div>
  );
}
