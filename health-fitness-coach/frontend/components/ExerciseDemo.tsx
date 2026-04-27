"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ExerciseDemo({ exerciseName }: { exerciseName: string }) {
  const [video, setVideo] = useState<{ youtube_id: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (video || loading) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/workouts/videos/${encodeURIComponent(exerciseName)}`
      );
      if (res.data.found) setVideo({ youtube_id: res.data.youtube_id });
    } catch {} finally { setLoading(false); }
  };

  return (
    <div>
      <button
        onClick={async () => { await load(); setOpen((o) => !o); }}
        className="text-xs text-green-400 hover:text-green-300 underline"
      >
        {open ? "Hide demo" : "Watch demo"}
      </button>
      {open && (
        <div className="mt-2 aspect-video w-full max-w-md rounded-lg overflow-hidden bg-slate-900">
          {video ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${video.youtube_id}`}
              title={`${exerciseName} demo`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              {loading ? "Loading…" : "No demo video available for this exercise."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}