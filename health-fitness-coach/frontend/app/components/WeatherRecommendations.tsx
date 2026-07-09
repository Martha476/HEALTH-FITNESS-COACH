"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface WeatherData {
  condition: "hot" | "cold" | "mild";
  indoor_focus: boolean;
  recommendations: string[];
  generated_at: string;
  error?: string;
}

export default function WeatherRecommendations() {
  const [data, setData] = useState<WeatherData | null>(null);
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
              latitude: 40.7128,
              longitude: -74.006,
              country_code: "US",
            },
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
    const interval = setInterval(fetchWeather, 3600000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) return null;

  const recs = data.recommendations ?? [];

  const conditionLabel: Record<string, string> = {
    hot:  "Hot weather",
    cold: "Cold weather",
    mild: "Great conditions",
  };

  const conditionColor: Record<string, string> = {
    hot:  "text-orange-400",
    cold: "text-blue-400",
    mild: "text-green-400",
  };

  const conditionIcon: Record<string, string> = {
    hot:  "☀️",
    cold: "❄️",
    mild: "🌤️",
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex justify-between items-center w-full text-left text-slate-200 font-medium mb-2"
      >
        <span>
          {conditionIcon[data.condition] ?? "🌤️"}{" "}
          Weather-Based Recommendations
        </span>
        <span className="text-xs text-slate-400">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div className="space-y-2 text-xs text-slate-300">

          {/* Condition badge */}
          <div className="bg-slate-700 rounded p-2 flex items-center gap-2">
            <span className={`font-semibold ${conditionColor[data.condition] ?? "text-slate-200"}`}>
              {conditionLabel[data.condition] ?? "Current conditions"}
            </span>
            {data.indoor_focus && (
              <span className="bg-blue-900/40 border border-blue-700/40 rounded px-1.5 py-0.5 text-blue-300 text-xs">
                Indoor focus recommended
              </span>
            )}
          </div>

          {/* Recommendations list */}
          {recs.length > 0 && (
            <div className="bg-slate-700/50 rounded p-2 space-y-1">
              {recs.map((tip, i) => (
                <p key={i} className="leading-snug">• {tip}</p>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}