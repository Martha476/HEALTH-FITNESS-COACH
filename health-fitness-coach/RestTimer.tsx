"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  defaultSeconds?: number;
  presets?: number[];
}

export default function RestTimer({ defaultSeconds = 60, presets = [30, 60, 90, 120, 180] }: Props) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      beep();
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining]);

  const beep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      [0, 0.25, 0.5].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.21);
      });
    } catch {}
  };

  const start = (s?: number) => {
    const next = s ?? seconds;
    setSeconds(next);
    setRemaining(next);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(seconds);
  };

  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-300 text-sm font-semibold">Rest Timer</span>
        <span className="text-3xl font-bold text-green-400 tabular-nums">
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </span>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-green-500 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => start(p)}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
          >
            {p}s
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => (running ? setRunning(false) : start())}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
        >
          {running ? "Pause" : remaining === 0 ? "Restart" : "Start"}
        </button>
        <button
          onClick={reset}
          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
        >
          Reset
        </button>
      </div>
    </div>
  );
}