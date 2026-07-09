"use client";

import { useState } from "react";
import axios from "axios";
import { useAuth } from "../app/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WorkoutRating({
  workoutId,
  onDone,
}: {
  workoutId?: string;
  onDone?: () => void;
}) {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState(3);
  const [felt, setFelt] = useState<"too_easy" | "just_right" | "too_hard">("just_right");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/workouts/rate`, {
        user_id: user.id,
        workout_id: workoutId,
        difficulty,
        felt,
        notes,
      });
      setDone(true);
      onDone?.();
    } finally { setSaving(false); }
  };

  if (done) {
    return (
      <div className="bg-green-900/20 border border-green-700/50 text-green-200 rounded-xl p-4 text-sm">
        Thanks — your coach will use this to tune future workouts.
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <p className="text-slate-100 font-semibold">How was that workout?</p>

      <div>
        <p className="text-xs text-slate-400 mb-1">Difficulty</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setDifficulty(n)}
              className={`flex-1 py-2 rounded text-sm font-bold ${
                difficulty === n
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {(["too_easy", "just_right", "too_hard"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFelt(f)}
            className={`flex-1 text-xs py-2 rounded ${
              felt === f ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any notes? (optional)"
        rows={2}
        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-100"
      />

      <button
        onClick={submit}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg"
      >
        {saving ? "Saving…" : "Submit rating"}
      </button>
    </div>
  );
}