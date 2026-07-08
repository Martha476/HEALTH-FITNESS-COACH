/**
 * Proactive Suggestions Widget
 * Displays AI-generated suggestions to the user in chat and dashboard
 */

'use client';

import React, { useState, useEffect } from 'react';

interface Suggestion {
  id: string;
  suggestion_text: string;
  reason: string;
  accepted: boolean;
  suggested_at: string;
}

export default function ProactiveSuggestionsWidget() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestions();
    // Poll for new suggestions every 30 minutes
    const interval = setInterval(fetchSuggestions, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/suggestions/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.filter((s: Suggestion) => !dismissedIds.has(s.id)));
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const acceptSuggestion = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/suggestions/${id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuggestions(suggestions.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to accept suggestion:', err);
    }
  };

  const dismissSuggestion = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/suggestions/${id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDismissedIds((prev) => new Set([...prev, id]));
        setSuggestions(suggestions.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm space-y-2 z-50">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-4 animate-slide-in"
        >
          <div className="flex gap-2 mb-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">{suggestion.reason === 'no_workout_3_days' ? '🏋️ Time to Move' : suggestion.reason === 'recovery_day' ? '🧘 Rest Day' : 'Progressive Overload'}</p>
              <p className="text-sm">{suggestion.suggestion_text}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => acceptSuggestion(suggestion.id)}
              className="flex-1 bg-white text-blue-600 font-bold py-2 rounded hover:bg-blue-50 transition text-sm"
            >
              Accept
            </button>
            <button
              onClick={() => dismissSuggestion(suggestion.id)}
              className="px-3 py-2 bg-white/20 text-white font-semibold rounded hover:bg-white/30 transition text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
