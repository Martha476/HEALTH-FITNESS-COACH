/**
 * Water Intake Tracker Component
 * Simple water logging with daily goal progress and visual feedback
 */

'use client';

import React, { useState, useEffect } from 'react';

interface WaterLog {
  id: string;
  glasses: number;
  ounces: number;
  daily_goal_ounces: number;
  percentage_of_goal: number;
  logged_date: string;
}

export default function WaterIntakeTracker() {
  const [todayWater, setTodayWater] = useState<WaterLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(64);
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    fetchTodayWater();
  }, []);

  const fetchTodayWater = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/water-intake/today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTodayWater(data);
      }
    } catch (err) {
      console.error('Failed to fetch water intake:', err);
    }
  };

  const logWater = async (glasses: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/water-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ glasses }),
      });
      if (res.ok) {
        const data = await res.json();
        setTodayWater(data);
      }
    } catch (err) {
      console.error('Failed to log water:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/water-intake/goal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ daily_goal_ounces: dailyGoal }),
      });
      if (res.ok) {
        setEditingGoal(false);
        fetchTodayWater();
      }
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  if (!todayWater) {
    return <div className="text-center py-8">Loading water tracker...</div>;
  }

  const percentage = todayWater.percentage_of_goal;
  const glassesCount = Math.round(todayWater.percentage_of_goal / 100 * 8); // 8 glasses = 64oz goal

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">💧 Water Intake</h2>
        <p className="text-gray-600">Stay hydrated!</p>
      </div>

      {/* Progress Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={
                percentage >= 100
                  ? '#10b981'
                  : percentage >= 75
                  ? '#3b82f6'
                  : percentage >= 50
                  ? '#f59e0b'
                  : '#ef4444'
              }
              strokeWidth="8"
              strokeDasharray={`${(percentage / 100) * 440} 440`}
              strokeLinecap="round"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold">{todayWater.ounces.toFixed(0)}</p>
            <p className="text-sm text-gray-600">/ {todayWater.daily_goal_ounces} oz</p>
          </div>
        </div>
      </div>

      {/* Glass Count */}
      <div className="text-center mb-6">
        <p className="text-2xl font-bold text-blue-600">
          {todayWater.glasses} 🥤
        </p>
        <p className="text-gray-600 text-sm">glasses logged</p>
      </div>

      {/* Status Message */}
      <div className="text-center mb-6">
        {percentage >= 100 ? (
          <p className="text-green-600 font-semibold">🎉 Goal reached!</p>
        ) : (
          <p className="text-blue-600 font-semibold">
            {((todayWater.daily_goal_ounces - todayWater.ounces) / 8).toFixed(0)} more glasses to go!
          </p>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          onClick={() => logWater(1)}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
        >
          +1
        </button>
        <button
          onClick={() => logWater(2)}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
        >
          +2
        </button>
        <button
          onClick={() => logWater(4)}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
        >
          +4
        </button>
      </div>

      {/* Daily Goal Editor */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-700 font-semibold">Daily Goal</p>
          {!editingGoal ? (
            <div className="flex items-center gap-2">
              <p className="font-bold">{todayWater.daily_goal_ounces} oz</p>
              <button
                onClick={() => setEditingGoal(true)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="border rounded px-2 py-1 w-20"
              />
              <button
                onClick={updateGoal}
                className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
