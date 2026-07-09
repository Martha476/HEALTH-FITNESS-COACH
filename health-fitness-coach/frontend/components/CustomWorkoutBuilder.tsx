"use client";

import { useState } from "react";
import axios from "axios";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../app/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Exercise {
  uid: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  weight?: string;
  group_id?: string;
  group_type?: "superset" | "circuit";
}

const EXERCISE_OPTIONS = [
  "Barbell Bench Press", "Incline Dumbbell Press", "Cable Flyes",
  "Bent Over Rows", "Pull-ups", "Overhead Press", "Lateral Raises",
  "Burpees", "Mountain Climbers", "Jump Squats", "Push-ups",
  "High Knees", "Plank", "Jump Rope", "Barbell Squat", "Deadlift",
  "Bench Press", "Goblet Squat", "Glute Bridge", "Bodyweight Squat",
];

function SortableRow({ ex, onChange, onRemove }: {
  ex: Exercise;
  onChange: (next: Exercise) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ex.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-700 rounded-lg p-3 border-l-4 ${
        ex.group_type === "superset" ? "border-purple-500"
        : ex.group_type === "circuit" ? "border-orange-500"
        : "border-green-500"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <button {...attributes} {...listeners} className="text-slate-400 cursor-grab px-1">⋮⋮</button>
        <select
          value={ex.name}
          onChange={(e) => onChange({ ...ex, name: e.target.value })}
          className="flex-1 bg-slate-800 text-slate-100 rounded px-2 py-1 text-sm"
        >
          {EXERCISE_OPTIONS.map((n) => <option key={n}>{n}</option>)}
        </select>
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm">✕</button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <input type="number" min={1} value={ex.sets}
          onChange={(e) => onChange({ ...ex, sets: +e.target.value })}
          className="bg-slate-800 rounded px-2 py-1 text-slate-100" placeholder="sets"/>
        <input value={ex.reps}
          onChange={(e) => onChange({ ...ex, reps: e.target.value })}
          className="bg-slate-800 rounded px-2 py-1 text-slate-100" placeholder="reps"/>
        <input type="number" min={0} value={ex.rest_seconds}
          onChange={(e) => onChange({ ...ex, rest_seconds: +e.target.value })}
          className="bg-slate-800 rounded px-2 py-1 text-slate-100" placeholder="rest s"/>
        <select
          value={ex.group_type || ""}
          onChange={(e) => {
            const v = e.target.value as "" | "superset" | "circuit";
            onChange({
              ...ex,
              group_type: v || undefined,
              group_id: v ? (ex.group_id || `g_${ex.uid}`) : undefined,
            });
          }}
          className="bg-slate-800 rounded px-2 py-1 text-slate-100"
        >
          <option value="">solo</option>
          <option value="superset">superset</option>
          <option value="circuit">circuit</option>
        </select>
      </div>
    </div>
  );
}

export default function CustomWorkoutBuilder() {
  const { user } = useAuth();
  const [name, setName] = useState("My Custom Workout");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const addExercise = () => {
    setExercises((arr) => [...arr, {
      uid: Date.now().toString(),
      name: EXERCISE_OPTIONS[0],
      sets: 3, reps: "10", rest_seconds: 60,
    }]);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setExercises((arr) => {
      const o = arr.findIndex((x) => x.uid === active.id);
      const n = arr.findIndex((x) => x.uid === over.id);
      return arrayMove(arr, o, n);
    });
  };

  const save = async () => {
    if (!user || exercises.length === 0) return;
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/workouts/custom`, {
        user_id: user.id,
        name,
        exercises: exercises.map(({ uid, ...rest }) => rest),
      });
      alert("Custom workout saved.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-semibold"
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={exercises.map((e) => e.uid)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {exercises.map((ex) => (
              <SortableRow
                key={ex.uid}
                ex={ex}
                onChange={(next) => setExercises((arr) => arr.map((e) => e.uid === ex.uid ? next : e))}
                onRemove={() => setExercises((arr) => arr.filter((e) => e.uid !== ex.uid))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <button onClick={addExercise}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg">
          + Add exercise
        </button>
        <button onClick={save} disabled={saving || !exercises.length}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg">
          {saving ? "Saving…" : "Save workout"}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Tip: drag exercises by ⋮⋮ to reorder. Set group type to <span className="text-purple-400">superset</span>/<span className="text-orange-400">circuit</span> to chain consecutive exercises.
      </p>
    </div>
  );
}