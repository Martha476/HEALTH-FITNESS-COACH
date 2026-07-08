"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Template {
  id: string;
  name: string;
  category: string;
  duration_weeks: number;
  days_per_week: number;
  description: string;
  tags: string[];
  days: any[];
}

export default function TemplatesLibrary({
  onSelect,
}: {
  onSelect: (template: Template) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/workouts/templates`)
      .then((r) => setTemplates(r.data.templates || []))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];
  const visible = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  if (loading) return <p className="text-slate-400">Loading templates…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-full ${
              filter === c
                ? "bg-green-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((t) => (
          <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-100 font-semibold">{t.name}</h3>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {t.category}
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-3">{t.description}</p>
            <p className="text-xs text-slate-500 mb-3">
              {t.duration_weeks} weeks · {t.days_per_week} days/week
            </p>
            <button
              onClick={() => onSelect(t)}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg"
            >
              Use this template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}