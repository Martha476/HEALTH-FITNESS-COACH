"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface WeatherRecommendation {
  location?: { latitude: number; longitude: number; country: string };
  weather?: {
    temperature: string;
    description: string;
    wind_speed: string;
  };
  recommendations?: {
    indoor_exercises: string[];
    outdoor_exercises: string[];
    warnings: string[];
    tips: string[];
  };
  error?: string;
}

export default function WeatherRecommendations() {
  const [data, setData] = useState<WeatherRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_URL}/api/weather/exercise-recommendations`,
          {
            params: {
              latitude: 40.7128,  // NYC default - in real app would use geolocation
              longitude: -74.006,
              country_code: "US"
            }
          }
        );
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch weather recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every hour
    const interval = setInterval(fetchWeather, 3600000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) return null;

  const weather = data.weather;
  const recs = data.recommendations;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex justify-between items-center w-full text-left text-slate-200 font-medium mb-2"
      >
        <span>🌤️ Weather-Based Recommendations</span>
        <span className="text-xs text-slate-400">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div className="space-y-2 text-xs text-slate-300">
          {/* Weather Info */}
          {weather && (
            <div className="bg-slate-700 rounded p-2 space-y-1">
              <p>🌡️ {weather.temperature}</p>
              <p>{weather.description}</p>
              <p>💨 Wind: {weather.wind_speed}</p>
            </div>
          )}

          {/* Warnings */}
          {recs?.warnings && recs.warnings.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/30 rounded p-2 space-y-1">
              {recs.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {/* Indoor/Outdoor suggestions */}
          {recs && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-semibold text-green-400 mb-1">🏋️ Indoor:</p>
                <ul className="space-y-0.5">
                  {recs.indoor_exercises.slice(0, 2).map((ex, i) => (
                    <li key={i}>• {ex}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-blue-400 mb-1">🏃 Outdoor:</p>
                <ul className="space-y-0.5">
                  {recs.outdoor_exercises.slice(0, 2).map((ex, i) => (
                    <li key={i}>• {ex}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tips */}
          {recs?.tips && recs.tips.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2">
              <p className="font-semibold text-blue-300 mb-1">💡 Tips:</p>
              <ul className="space-y-0.5">
                {recs.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
