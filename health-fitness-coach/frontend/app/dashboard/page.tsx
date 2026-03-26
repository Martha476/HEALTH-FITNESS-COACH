"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/ai-coach",  icon: "🤖", label: "AI Coach"  },
  { href: "/workouts",  icon: "🏋️", label: "Workouts"  },
  { href: "/nutrition", icon: "🥗", label: "Nutrition" },
  { href: "/progress",  icon: "📊", label: "Progress"  },
  { href: "/profile",   icon: "👤", label: "Profile"   },
  { href: "/settings",  icon: "⚙️", label: "Settings"  },
  { href: "/help",      icon: "❓", label: "Help"      },
];

// ─── Carousel ─────────────────────────────────────────────────────────────────
const CAROUSEL_IMAGES = [
  { url: "/images/download (6).jpg",                                                                      title: "Strength & Power",   description: "Push your limits with guided strength workouts."  },
  { url: "/images/Gym Workout_ Overhead Lunges for Strength & Fitness.jpg",                               title: "Full Body Training", description: "Personalized plans for every fitness level."      },
  { url: "/images/download (6).jpg",                                                                      title: "Cardio & Endurance", description: "Boost your stamina with dynamic routines."        },
  { url: "/images/download (7).jpg",                                                                      title: "Nutrition Planner",  description: "Plan your meals and track your macros."           },
];

// ─── Quick Actions — correct names ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { href: "/ai-coach",  img: "/images/download.jpg",                                                                                           icon: "🤖", label: "Chat with AI Coach",    border: "border-green-500 hover:border-green-400"    },
  { href: "/workouts",  img: "/images/Gym Workout_ Overhead Lunges for Strength & Fitness.jpg",                                                icon: "🏋️", label: "Generate Workout Plan", border: "border-blue-500 hover:border-blue-400"      },
  { href: "/nutrition", img: "/images/Discover simple and natural ways to strengthen your immune system with healthy foods, daily habits,.jpg", icon: "🥗", label: "Log Today's Meals",     border: "border-emerald-500 hover:border-emerald-400" },
  { href: "/progress",  img: "/images/Morning Mindfulness.jpg",                                                                                icon: "📊", label: "Track My Progress",     border: "border-cyan-500 hover:border-cyan-400"      },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
function scopedKey(userId: string, key: string) {
  return `user_${userId}_${key}`;
}
function readList<T>(userId: string, key: string): T[] {
  try {
    const s = localStorage.getItem(scopedKey(userId, key));
    if (s) return JSON.parse(s) as T[];
    const g = localStorage.getItem(key);
    if (g) return JSON.parse(g) as T[];
  } catch {}
  return [];
}
function readObject<T extends object>(userId: string, key: string): T {
  try {
    const s = localStorage.getItem(scopedKey(userId, key));
    if (s) return JSON.parse(s) as T;
    const g = localStorage.getItem(key);
    if (g) return JSON.parse(g) as T;
  } catch {}
  return {} as T;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  open: boolean; onClose: () => void;
  collapsed: boolean; onToggleCollapse: () => void;
  user: any; logout: () => void; pathname: string;
}

function Sidebar({ open, onClose, collapsed, onToggleCollapse, user, logout, pathname }: SidebarProps) {
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onClose} />}
      <aside className={[
        "fixed lg:relative z-30 flex flex-col h-full",
        "bg-slate-900 border-r border-slate-700/60 transition-all duration-300 ease-in-out shrink-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "w-[72px]" : "w-64",
      ].join(" ")}>

        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/60 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xl shrink-0">🏋️</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">FitCoach AI</p>
              <p className="text-xs text-slate-500 truncate">Your AI fitness companion</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                  active ? "bg-green-500/15 text-green-400 border border-green-500/25" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
                  collapsed ? "justify-center" : "",
                ].join(" ")}>
                <span className="text-base leading-none shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                {active && !collapsed && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2 py-1 bg-slate-700 text-slate-100 text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-600 shadow-lg">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/60 space-y-2">
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl bg-slate-800/60 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-xs font-bold text-white shrink-0">{initials}</div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
              </div>
            )}
          </div>
          <button onClick={onToggleCollapse}
            className={`hidden lg:flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-colors ${collapsed ? "justify-center" : ""}`}>
            <span className="text-base">{collapsed ? "→" : "←"}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={logout}
            className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors ${collapsed ? "justify-center" : ""}`}>
            <span className="text-base">🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, image, color = "text-slate-100" }: {
  icon: string; label: string; value: number | string;
  unit: string; image: string; color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 hover:shadow-2xl hover:border-slate-600 transition-all duration-300">
      <div className="rounded-xl overflow-hidden h-28 mb-4">
        <img src={image} alt={label} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium tracking-wide uppercase mb-1">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>
            {value} <span className="text-base font-normal text-slate-400">{unit}</span>
          </p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}

// ─── Macro Bar — real data ────────────────────────────────────────────────────
function MacroBar({ label, current, goal, color }: {
  label: string; current: number; goal: number; color: string;
}) {
  const pct  = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const unit = label === "Calories" ? "kcal" : "g";
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-sm w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-600 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-200 text-xs font-semibold w-28 text-right shrink-0">
        {current} / {goal} {unit}
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Dashboard
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentSlide,     setCurrentSlide]     = useState(0);
  const [profileComplete,  setProfileComplete]  = useState(false);
  const [userName,         setUserName]         = useState("");

  // ── REAL data state (no more dummy values) ────────────────────────────────
  const [stats, setStats] = useState({
    caloriesBurned: 0,
    workoutCount:   0,
    totalMinutes:   0,
    waterIntake:    0,
  });

  const [macros, setMacros] = useState({
    calories: { current: 0, goal: 2000 },
    protein:  { current: 0, goal: 150  },
    carbs:    { current: 0, goal: 200  },
    fats:     { current: 0, goal: 65   },
  });

  const [recentWorkout, setRecentWorkout] = useState<{
    name: string; date: string; duration: number;
  } | null>(null);

  const [weightInfo, setWeightInfo] = useState<{
    current: number; target: number; unit: string;
  } | null>(null);

  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carousel auto-advance
  useEffect(() => {
    slideTimer.current = setInterval(() =>
      setCurrentSlide((p) => (p === CAROUSEL_IMAGES.length - 1 ? 0 : p + 1)), 4500);
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, []);

  const prevSlide = () => setCurrentSlide((p) => (p === 0 ? CAROUSEL_IMAGES.length - 1 : p - 1));
  const nextSlide = () => setCurrentSlide((p) => (p === CAROUSEL_IMAGES.length - 1 ? 0 : p + 1));

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // ── Load ALL real data from localStorage + backend ────────────────────────
  const loadData = useCallback(() => {
    if (!user) return;
    setUserName(user.name || "User");

    // 1. Profile
    const profile      = readObject<any>(user.id, "userProfile");
    const hasProfile   = !!(profile.age && profile.currentWeight && profile.primaryGoal);
    setProfileComplete(hasProfile);

    if (hasProfile) {
      const unit = profile.preferredUnit === "metric" ? "kg" : "lbs";
      setWeightInfo({
        current: profile.currentWeight || 0,
        target:  profile.targetWeight  || 0,
        unit,
      });
    }

    // 2. Workouts → today's stats
    const workouts      = readList<any>(user.id, "workoutHistory");
    const today         = new Date().toDateString();
    const todayWorkouts = workouts.filter((w) => new Date(w.date).toDateString() === today);
    const totalMins     = todayWorkouts.reduce((s: number, w: any) => s + (w.duration || 0), 0);

    // Most recent workout (any day)
    if (workouts.length > 0) {
      const sorted = [...workouts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecentWorkout({ name: sorted[0].name, date: sorted[0].date, duration: sorted[0].duration });
    } else {
      setRecentWorkout(null);
    }

    // 3. Water — daily reset
    const waterDate  = localStorage.getItem("waterIntakeDate");
    const waterCount = parseInt(localStorage.getItem("waterIntake") || "0");

    // 4. Meals → today's macros
    const meals      = readList<any>(user.id, "mealHistory");
    const todayMeals = meals.filter((m) => new Date(m.date).toDateString() === today);
    const totCals    = todayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
    const totProt    = todayMeals.reduce((s: number, m: any) => s + (m.protein  || 0), 0);
    const totCarbs   = todayMeals.reduce((s: number, m: any) => s + (m.carbs    || 0), 0);
    const totFats    = todayMeals.reduce((s: number, m: any) => s + (m.fats     || 0), 0);

    const calGoal  = profile.dailyCalorieGoal || 2000;
    const protGoal = Math.round(calGoal * 0.3 / 4);
    const carbGoal = Math.round(calGoal * 0.4 / 4);
    const fatGoal  = Math.round(calGoal * 0.3 / 9);

    setStats({
      caloriesBurned: todayWorkouts.length * 350,
      workoutCount:   todayWorkouts.length,
      totalMinutes:   totalMins,
      waterIntake:    waterDate === today ? waterCount : 0,
    });

    setMacros({
      calories: { current: totCals,  goal: calGoal  },
      protein:  { current: totProt,  goal: protGoal },
      carbs:    { current: totCarbs, goal: carbGoal },
      fats:     { current: totFats,  goal: fatGoal  },
    });

    // 5. Try backend stats (non-blocking)
    const token = localStorage.getItem("fitcoach_token");
    if (token) {
      fetch(`${API_URL}/api/stats/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.stats?.length > 0) {
            const s = data.stats[0];
            setStats((prev) => ({
              caloriesBurned: s.caloriesBurned || prev.caloriesBurned,
              workoutCount:   s.workoutCount   || prev.workoutCount,
              totalMinutes:   s.totalMinutes   || prev.totalMinutes,
              waterIntake:    s.waterIntake    || prev.waterIntake,
            }));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user?.id, loadData]);

  // Auto-refresh when other pages save data
  useEffect(() => {
    const handle = (e: StorageEvent) => {
      const keys = ["workoutHistory", "mealHistory", "waterIntake", "userProfile"];
      if (e.key && keys.some((k) => e.key!.includes(k))) loadData();
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [loadData]);

  const hasNoData =
    stats.caloriesBurned === 0 && stats.workoutCount === 0 &&
    stats.totalMinutes === 0   && macros.calories.current === 0;

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">

      <Sidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        user={user} logout={logout} pathname={pathname}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-slate-700/60 bg-slate-900/95 backdrop-blur-sm shrink-0">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu"
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate">Dashboard</h2>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/ai-coach"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <span>🤖</span><span>Ask Coach</span>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* 1. Carousel */}
            <section className="relative overflow-hidden rounded-2xl shadow-2xl h-72 sm:h-80 lg:h-96">
              {CAROUSEL_IMAGES.map((slide, index) => (
                <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}>
                  <img src={slide.url} alt={slide.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white">
                    <h1 className="text-2xl sm:text-4xl font-bold mb-1">Welcome back, {userName}! 👋</h1>
                    <p className="text-base sm:text-xl font-semibold mb-1">{slide.title}</p>
                    <p className="text-sm text-slate-300 hidden sm:block">{slide.description}</p>
                  </div>
                </div>
              ))}
              <button onClick={prevSlide} aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2.5 rounded-full transition-all">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={nextSlide} aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2.5 rounded-full transition-all">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {CAROUSEL_IMAGES.map((_, i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all ${i === currentSlide ? "bg-white w-6" : "bg-white/50 w-2"}`} />
                ))}
              </div>
            </section>

            {/* 2. Profile incomplete */}
            {!profileComplete && (
              <section className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-l-4 border-amber-500 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">🎯</span>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-amber-400 mb-1">⚠️ Complete Your Profile First!</h3>
                    <p className="text-slate-300 text-sm mb-3">Complete your fitness profile to unlock personalized AI coaching and workout plans.</p>
                    <Link href="/profile" className="inline-block bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      ✨ Complete Profile Now →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Getting started */}
            {hasNoData && profileComplete && (
              <section className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-l-4 border-green-500 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">🚀</span>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-green-400 mb-1">Get Started with Your Fitness Journey!</h3>
                    <p className="text-slate-300 text-sm mb-3">Profile complete! Log a workout, meal, or chat with your coach to see real data here.</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/ai-coach"  className="bg-green-600  hover:bg-green-700  text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">🤖 Chat with AI Coach</Link>
                      <Link href="/workouts"  className="bg-blue-600   hover:bg-blue-700   text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">🏋️ Generate Workout</Link>
                      <Link href="/nutrition" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">🥗 Log a Meal</Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 4. Weight info — real from profile */}
            {weightInfo && weightInfo.current > 0 && (
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center gap-3">
                  <span className="text-3xl">⚖️</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Current Weight</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {weightInfo.current} <span className="text-sm font-normal text-slate-400">{weightInfo.unit}</span>
                    </p>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Target Weight</p>
                    <p className="text-2xl font-bold text-green-400">
                      {weightInfo.target > 0 ? weightInfo.target : "—"} <span className="text-sm font-normal text-slate-400">{weightInfo.unit}</span>
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 5. Today's real stats */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="🔥" label="Calories Burned Today" value={stats.caloriesBurned} unit="kcal"    color="text-orange-400" image="/images/Calorie Deficit Calculator – Calculate, Plan & Maintain Your Ideal Weight.jpg" />
              <StatCard icon="🏋️" label="Workouts Today"        value={stats.workoutCount}   unit="sessions" color="text-blue-400"   image="/images/Gym Workout_ Overhead Lunges for Strength & Fitness.jpg" />
              <StatCard icon="⏱️" label="Active Minutes Today"  value={stats.totalMinutes}   unit="min"      color="text-yellow-400" image="/images/Sneaky Exercise Hacks for Maximum Results.jpg" />
              <StatCard icon="💧" label="Water Intake Today"    value={stats.waterIntake}    unit="glasses"  color="text-cyan-400"   image="/images/Natural Way to Support Your Teeth.jpg" />
            </section>

            {/* 6. Last workout */}
            {recentWorkout && (
              <section className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏅</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Last Workout</p>
                    <p className="text-sm font-bold text-slate-100">{recentWorkout.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(recentWorkout.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {recentWorkout.duration} min
                    </p>
                  </div>
                </div>
                <Link href="/workouts" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0">
                  + New Workout
                </Link>
              </section>
            )}

            {/* 7. Nutrition — real macro data */}
            <section className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 hover:shadow-2xl transition-shadow duration-300 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold text-gray-100">Today's Nutrition</h2>
                  <span className="text-xs text-slate-400">
                    {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                {macros.calories.current === 0 && (
                  <p className="text-xs text-slate-500">No meals logged today — visit Nutrition to add meals.</p>
                )}
              </div>

              <div className="overflow-hidden h-44 mx-5 rounded-xl mb-5">
                <img
                  src="/images/Discover simple and natural ways to strengthen your immune system with healthy foods, daily habits,.jpg"
                  alt="Healthy meal"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="px-5 pb-5 space-y-3">
                {/* REAL macros — no more hardcoded 65%, 72% etc */}
                <MacroBar label="Calories" current={macros.calories.current} goal={macros.calories.goal} color="bg-green-500"  />
                <MacroBar label="Protein"  current={macros.protein.current}  goal={macros.protein.goal}  color="bg-blue-500"   />
                <MacroBar label="Carbs"    current={macros.carbs.current}    goal={macros.carbs.goal}    color="bg-red-500"    />
                <MacroBar label="Fats"     current={macros.fats.current}     goal={macros.fats.goal}     color="bg-yellow-500" />

                <div className="flex gap-2 mt-2">
                  <Link href="/nutrition"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold transition-colors block text-center text-sm">
                    🥗 Log a Meal
                  </Link>
                  <Link href="/nutrition"
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl font-semibold transition-colors block text-center text-sm border border-slate-600">
                    View Full Plan
                  </Link>
                </div>
              </div>
            </section>

            {/* 8. Quick Actions — correct names */}
            <section className="bg-white rounded-2xl shadow-lg border border-teal-200 p-5">
              <h2 className="text-lg font-bold text-slate-800 mb-5 text-center">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.href} href={action.href}
                    className={`bg-white border-2 ${action.border} p-4 rounded-2xl text-center hover:shadow-xl transition-all duration-300 flex flex-col`}>
                    <div className="rounded-xl overflow-hidden mb-3 h-24 shrink-0">
                      <img src={action.img} alt={action.label} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="text-3xl mb-2">{action.icon}</div>
                    <div className="font-bold text-sm leading-tight text-slate-800">{action.label}</div>
                  </Link>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}