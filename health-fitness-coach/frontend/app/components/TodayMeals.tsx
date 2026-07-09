"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Entry {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  serving_g: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

interface Totals { calories: number; protein_g: number; carbs_g: number; fat_g: number; }

interface TodayResp {
  date: string;
  entries: Entry[];
  by_meal: Record<string, Entry[]>;
  totals: Totals;
  count: number;
}

const MEAL_ORDER: Entry["meal_type"][] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_ICON: Record<Entry["meal_type"], string> = {
  breakfast: "??", lunch: "??", dinner: "???", snack: "??",
};

interface Props {
  /** Daily targets from user profile (optional) */
  targets?: Partial<Totals>;
  /** Bumped by parent after a successful log to trigger a refetch */
  refreshKey?: number;
}

export default function TodayMeals({ targets, refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<TodayResp | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/api/nutrition/meals/today/${user.id}`);
      setData(r.data);
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetchToday(); }, [fetchToday, refreshKey]);

  const remove = async (entryId: string) => {
    if (!user) return;
    await axios.delete(`${API_URL}/api/nutrition/meals/${user.id}/${entryId}`);
    fetchToday();
  };

  const clearAll = async () => {
    if (!user || !confirm("Clear all of today's meals?")) return;
    await axios.delete(`${API_URL}/api/nutrition/meals/${user.id}/today/clear`);
    fetchToday();
  };

  if (!data) return <p className="text-slate-400 text-sm">{loading ? "Loading…" : ""}</p>;

  const t = data.totals;
  const macroBar = (label: string, val: number, target?: number, color: string = "bg-green-500") => {
    const pct = target && target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0;
    return (
      <div>
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>{label}</span>
          <span>{val}{target ? ` / ${target}` : ""} {label === "kcal" ? "" : "g"}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-200 font-semibold">?? Today's meals</p>
        {data.count > 0 && (
          <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-400">
            Clear all
          </button>
        )}
      </div>

      {/* Macro totals */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["kcal",  t.calories,  "text-yellow-400"],
          ["P g",   t.protein_g, "text-emerald-400"],
          ["C g",   t.carbs_g,   "text-blue-400"],
          ["F g",   t.fat_g,     "text-orange-400"],
        ].map(([l, v, c]) => (
          <div key={l as string} className="bg-slate-700 rounded-lg py-2">
            <p className="text-[10px] uppercase text-slate-400">{l}</p>
            <p className={`text-lg font-bold ${c}`}>{v as number}</p>
          </div>
        ))}
      </div>

      {/* Progress bars vs targets */}
      {targets && (
        <div className="space-y-2 pt-1">
          {macroBar("kcal",      t.calories,  targets.calories,  "bg-yellow-500")}
          {macroBar("Protein",   t.protein_g, targets.protein_g, "bg-emerald-500")}
          {macroBar("Carbs",     t.carbs_g,   targets.carbs_g,   "bg-blue-500")}
          {macroBar("Fat",       t.fat_g,     targets.fat_g,     "bg-orange-500")}
        </div>
      )}

      {/* Entries grouped by meal type */}
      <div className="space-y-3 pt-2 border-t border-slate-700">
        {data.count === 0 && (
          <p className="text-slate-500 text-sm italic">
            No meals logged yet — search or scan a food to add it here.
          </p>
        )}
        {MEAL_ORDER.map((m) => {
          const items = data.by_meal[m] || [];
          if (!items.length) return null;
          return (
            <div key={m} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{MEAL_ICON[m]}</span>
                <h4 className="text-slate-200 font-medium capitalize">{m}</h4>
              </div>
              {items.map((entry) => (
                <div key={entry.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-slate-400 text-xs">
                      {entry.serving_g}g · {entry.calories} kcal · P:{entry.protein_g}g C:{entry.carbs_g}g F:{entry.fat_g}g
                    </p>
                  </div>
                  <button
                    onClick={() => remove(entry.id)}
                    className="ml-2 text-slate-500 hover:text-red-400 text-sm"
                    title="Delete entry"
                  >
                    ?
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
