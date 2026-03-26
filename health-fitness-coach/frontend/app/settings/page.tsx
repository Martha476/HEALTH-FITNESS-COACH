"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  recordTokenUsage, 
  clearTokenHistory, 
  fetchTokenStatsFromBackend,
  loadTokenStatsFromStorage,
  calculateCost,
  getAllModelCosts,
  type TokenStats,
  type TokenUsageEntry
} from "../../lib/tokenTracking";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const SETTINGS_KEY = "aiCoachSettings";

// ─── Default settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  llm:              "openai",
  temperature:      0.7,
  topP:             0.9,
  frequencyPenalty: 0,
  personality:      "friendly",
  enableCache:      true,
  enableTools:      true,
  enabledTools:     [] as string[],
  units:            "metric",
  notifications:    false,
  theme:            "dark",
  language:         "en",
};

type AgentSettings = typeof DEFAULT_SETTINGS;

// ─── Tools ────────────────────────────────────────────────────────────────────
const AVAILABLE_TOOLS = [
  { id: "generate_workout_plan", name: "Workout Plan Generator", desc: "Creates personalised workout plans.", icon: "💪", version: "v1.2" },
  { id: "calculate_nutrition",   name: "Nutrition Calculator",   desc: "Calculates daily nutrition needs.",  icon: "🥗", version: "v1.1" },
  { id: "analyze_progress",      name: "Progress Analyzer",      desc: "Tracks and analyzes progress.",      icon: "📈", version: "v1.0" },
  { id: "search_exercises",      name: "Exercise Search",        desc: "Finds exercises for your goals.",    icon: "🔍", version: "v1.0" },
  { id: "track_goals",           name: "Goal Tracker",           desc: "Monitors fitness goals.",            icon: "🎯", version: "v1.0" },
];

// ─── Agents ───────────────────────────────────────────────────────────────────
const AVAILABLE_AGENTS = [
  { id: "health_agent",     name: "Health Agent",     desc: "Health advice and metrics.",         icon: "🩺", version: "v2.0" },
  { id: "fitness_agent",    name: "Fitness Agent",    desc: "Workout guidance and routines.",     icon: "🏃", version: "v1.5" },
  { id: "nutrition_agent",  name: "Nutrition Agent",  desc: "Nutrition guidance and meal plans.", icon: "🍎", version: "v1.3" },
  { id: "progress_agent",   name: "Progress Agent",   desc: "Analyzes and visualizes progress.",  icon: "📊", version: "v1.1" },
  { id: "supervisor_agent", name: "Supervisor Agent", desc: "Coordinates all agents.",            icon: "👔", version: "v1.0" },
];

// ─── Languages ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "en", label: "English"   },
  { code: "es", label: "Español"   },
  { code: "fr", label: "Français"  },
  { code: "de", label: "Deutsch"   },
  { code: "zh", label: "中文"      },
  { code: "ar", label: "العربية"   },
  { code: "ru", label: "Русский"   },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語"    },
  { code: "hi", label: "हिन्दी"    },
];

// ─── Model pricing ────────────────────────────────────────────────────────────
const MODEL_COSTS = getAllModelCosts();

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function getStoredSettings(): AgentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

const toBackendFormat = (s: AgentSettings) => ({
  llm:               s.llm,
  temperature:       s.temperature,
  topP:              s.topP,
  top_p:             s.topP,
  frequencyPenalty:  s.frequencyPenalty,
  frequency_penalty: s.frequencyPenalty,
  personality:       s.personality,
  enableCache:       s.enableCache,
  enableTools:       s.enableTools,
  enabledTools:      s.enabledTools,
  units:             s.units,
  notifications:     s.notifications,
  theme:             s.theme,
  language:          s.language,
});

// ── Real-time side effects ─────────────────────────────────────────────────────

/** Apply theme immediately to body + html */
function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme               = "dark";
    document.body.style.backgroundColor = "#0f172a";
    document.body.style.color           = "#f8fafc";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme               = "light";
    document.body.style.backgroundColor = "#ccfbf1";
    document.body.style.color           = "#042f2e";
  }
}

/** Set html lang + dir, fire StorageEvent for translation hooks */
function applyLanguage(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
  window.dispatchEvent(new StorageEvent("storage", {
    key: SETTINGS_KEY, newValue: localStorage.getItem(SETTINGS_KEY),
  }));
}

/** Save units + notify Progress/Nutrition pages */
function applyUnits(units: string) {
  localStorage.setItem("preferredUnits", units);
  window.dispatchEvent(new StorageEvent("storage", {
    key: "preferredUnits", newValue: units,
  }));
}

/** Request browser notification permission */
async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") {
    alert("Notifications are blocked. Enable them in your browser site settings.");
    return false;
  }
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendTestNotification() {
  if (Notification.permission === "granted") {
    new Notification("FitCoach AI 🏋️", {
      body: "Notifications are enabled! You'll get workout reminders here.",
      icon: "/favicon.ico",
    });
  }
}

function loadTokenStats(userId: string): TokenStats {
  return loadTokenStatsFromStorage(userId);
}

// ─── Toggle switch component ───────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? "bg-green-600" : "bg-slate-600"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Settings Page
// ═════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [settings,        setSettings]        = useState<AgentSettings>({ ...DEFAULT_SETTINGS });
  const [enabledAgents,   setEnabledAgents]   = useState<string[]>([]);
  const [toolLoading,     setToolLoading]     = useState<string | null>(null);
  const [agentLoading,    setAgentLoading]    = useState<string | null>(null);
  const [saveMessage,     setSaveMessage]     = useState("");
  const [saveMsgType,     setSaveMsgType]     = useState<"success" | "local">("success");
  const [passwords,       setPasswords]       = useState({ current: "", new: "", confirm: "" });
  const [pwLoading,       setPwLoading]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword,  setDeletePassword]  = useState("");
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [tokenStats,      setTokenStats]      = useState<TokenStats | null>(null);
  const [activeTab,       setActiveTab]       = useState<"general" | "ai" | "tools" | "tokens" | "account">("general");

  // Live tracking state
  const [liveStats, setLiveStats] = useState({
    toolsActive:   0,
    agentsActive:  0,
    cacheHits:     0,
    lastSaved:     "" as string,
    backendOnline: false,
  });

  const saveTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const sliderTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pingTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredSettings();
    setSettings(stored);
    applyTheme(stored.theme);
    applyLanguage(stored.language);
    applyUnits(stored.units);
    fetchSettings();
    fetchAgents();
    pingBackend();
  }, []);

  // ── Live backend ping every 30s ────────────────────────────────────────────
  useEffect(() => {
    pingTimer.current = setInterval(pingBackend, 30000);
    return () => { if (pingTimer.current) clearInterval(pingTimer.current); };
  }, []);

  // ── Update live stats whenever settings change ─────────────────────────────
  useEffect(() => {
    setLiveStats((prev) => ({
      ...prev,
      toolsActive:  settings.enableTools ? settings.enabledTools.length : 0,
      agentsActive: enabledAgents.length,
    }));
  }, [settings.enabledTools, settings.enableTools, enabledAgents]);

  // ── Load token stats when tab opens ───────────────────────────────────────
  useEffect(() => {
    if (activeTab === "tokens" && user) {
      const token = getToken();
      if (token) {
        fetchTokenStatsFromBackend(token).then((stats) => {
          if (stats) {
            setTokenStats(stats);
          } else {
            // Fallback to localStorage
            setTokenStats(loadTokenStats(user.id));
          }
        });
      } else {
        setTokenStats(loadTokenStats(user.id));
      }
    }
  }, [activeTab, user]);

  const getToken = () => localStorage.getItem("fitcoach_token");

  const pingBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      setLiveStats((prev) => ({ ...prev, backendOnline: res.ok }));
    } catch {
      setLiveStats((prev) => ({ ...prev, backendOnline: false }));
    }
  };

  const fetchSettings = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data   = await res.json();
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(toBackendFormat(merged)));
        applyTheme(merged.theme);
        applyLanguage(merged.language);
        applyUnits(merged.units);
      }
    } catch {}
  };

  const fetchAgents = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/settings/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnabledAgents(data.enabledAgents ?? []);
        localStorage.setItem("enabledAgents", JSON.stringify(data.enabledAgents ?? []));
      }
    } catch {
      const saved = localStorage.getItem("enabledAgents");
      if (saved) { try { setEnabledAgents(JSON.parse(saved)); } catch {} }
    }
  };

  const showMsg = (msg: string, type: "success" | "local" = "success") => {
    setSaveMessage(msg);
    setSaveMsgType(type);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveMessage(""), 2500);
  };

  // ── Persist to localStorage + backend ─────────────────────────────────────
  const persistSettings = useCallback(async (updated: AgentSettings) => {
    const payload = toBackendFormat(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));

    // Apply all side effects in real time
    applyTheme(updated.theme);
    applyLanguage(updated.language);
    applyUnits(updated.units);

    // Update last saved timestamp
    setLiveStats((prev) => ({
      ...prev,
      lastSaved: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    }));

    // Sync to backend
    try {
      const token = getToken();
      if (!token) { showMsg("💾 Saved locally!", "local"); return; }
      const res = await fetch(`${API_URL}/api/settings`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      showMsg(res.ok ? "✓ Settings saved!" : "💾 Saved locally!", res.ok ? "success" : "local");
    } catch {
      showMsg("💾 Saved locally!", "local");
    }
  }, []);

  // ── Handle instant setting change ─────────────────────────────────────────
  const handleChange = async (field: keyof AgentSettings, value: any) => {
    if (field === "notifications" && value === true) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const updated = { ...settings, notifications: true };
      setSettings(updated);
      await persistSettings(updated);
      sendTestNotification();
      return;
    }
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    await persistSettings(updated);
  };

  // ── Slider — update UI instantly, debounce backend call ──────────────────
  const handleSlider = (field: keyof AgentSettings, value: number) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);                          // instant UI update
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toBackendFormat(updated))); // instant local save
    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    sliderTimer.current = setTimeout(() => persistSettings(updated), 400); // debounced backend
  };

  // ── Tool toggle ────────────────────────────────────────────────────────────
  const handleToolToggle = async (toolId: string) => {
    if (!settings.enableTools) { showMsg("⚠️ Enable AI Tools first.", "local"); return; }
    setToolLoading(toolId);
    const updatedTools = settings.enabledTools.includes(toolId)
      ? settings.enabledTools.filter((t) => t !== toolId)
      : [...settings.enabledTools, toolId];
    const updated = { ...settings, enabledTools: updatedTools };
    setSettings(updated);
    await persistSettings(updated);
    setToolLoading(null);
  };

  // ── Agent toggle ───────────────────────────────────────────────────────────
  const handleAgentToggle = async (agentId: string) => {
    setAgentLoading(agentId);
    const updated = enabledAgents.includes(agentId)
      ? enabledAgents.filter((a) => a !== agentId)
      : [...enabledAgents, agentId];
    setEnabledAgents(updated);
    localStorage.setItem("enabledAgents", JSON.stringify(updated));
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API_URL}/api/settings/agents`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ enabledAgents: updated }),
        });
      }
    } catch {}
    setAgentLoading(null);
    showMsg("✓ Agent updated!");
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) { showMsg("❌ Passwords do not match.", "local"); return; }
    if (passwords.new.length < 6)            { showMsg("❌ Password must be at least 6 characters.", "local"); return; }
    setPwLoading(true);
    try {
      const token = getToken();
      const res   = await fetch(`${API_URL}/api/auth/update-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: user?.email, old_password: passwords.current, new_password: passwords.new }),
      });
      if (res.ok) { showMsg("✓ Password changed successfully!"); setPasswords({ current: "", new: "", confirm: "" }); }
      else         { const d = await res.json(); showMsg(`❌ ${d.detail || "Failed to change password."}`, "local"); }
    } catch {
      showMsg("❌ Failed to change password.", "local");
    }
    setPwLoading(false);
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletePassword) { showMsg("❌ Enter your password to confirm.", "local"); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/delete-account`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ email: user?.email, password: deletePassword }),
      });
      if (res.ok) { localStorage.clear(); window.location.href = "/login"; }
      else         { showMsg("❌ Failed to delete. Check your password.", "local"); setDeleteLoading(false); }
    } catch {
      showMsg("❌ Failed to delete account.", "local");
      setDeleteLoading(false);
    }
  };

  const clearTokenHistoryHandler = () => {
    if (!user || !window.confirm("Clear all token usage history?")) return;
    const token = getToken();
    clearTokenHistory(user.id, token);
    setTokenStats({ totalTokens: 0, totalCost: 0, totalMessages: 0, history: [], byModel: {} });
    showMsg("✓ Token history cleared!");
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const pwsMatch  = passwords.new && passwords.confirm && passwords.new === passwords.confirm && passwords.new.length >= 6;
  const pwNoMatch = passwords.new && passwords.confirm && passwords.new !== passwords.confirm;
  const notifStatus = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";

  const selectCls = "p-2.5 border border-slate-600 rounded-lg w-full bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm";
  const inputCls  = "p-2.5 border border-slate-600 rounded-lg w-full bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm";
  const cardCls   = "bg-slate-800 text-slate-100 rounded-xl shadow p-5 flex flex-col gap-4 border border-slate-700";

  const tabs = [
    { id: "general", label: "⚙️ General"       },
    { id: "ai",      label: "🤖 AI Model"       },
    { id: "tools",   label: "🛠️ Tools & Agents" },
    { id: "tokens",  label: "📊 Token Usage"    },
    { id: "account", label: "👤 Account"        },
  ] as const;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400">Loading...</p>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* ── Live status bar ────────────────────────────────────────────────── */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${liveStats.backendOnline ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
          <span className="text-slate-400">Backend {liveStats.backendOnline ? "online" : "offline"}</span>
        </div>
        <div className="w-px h-3 bg-slate-600" />
        <span className="text-slate-400">🛠️ <span className="text-green-400 font-semibold">{liveStats.toolsActive}</span> tools active</span>
        <div className="w-px h-3 bg-slate-600" />
        <span className="text-slate-400">🤖 <span className="text-blue-400 font-semibold">{liveStats.agentsActive}</span> agents active</span>
        <div className="w-px h-3 bg-slate-600" />
        <span className="text-slate-400">🌡 Temp <span className="text-yellow-400 font-semibold">{settings.temperature}</span></span>
        <div className="w-px h-3 bg-slate-600" />
        <span className="text-slate-400">🌐 <span className="text-slate-200 font-semibold uppercase">{settings.language}</span></span>
        {liveStats.lastSaved && (
          <>
            <div className="w-px h-3 bg-slate-600" />
            <span className="text-slate-500">Last saved {liveStats.lastSaved}</span>
          </>
        )}
      </div>

      {/* ── User header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-2">
        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-100 mb-3 border-2 border-green-500">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <h1 className="text-xl font-bold text-slate-100 mb-1">
          {user?.name ? `Welcome, ${user.name}!` : "Settings"}
        </h1>
        <p className="text-slate-400 text-sm">{user?.email || "Configure your AI coach"}</p>

        {/* Live status pills */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          <span className="text-xs bg-green-900/40 border border-green-700/50 text-green-300 px-3 py-1 rounded-full">
            {settings.llm === "openai" ? "GPT-4" : settings.llm === "anthropic" ? "Claude" : "Gemini"}
          </span>
          <span className="text-xs bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1 rounded-full capitalize">
            {settings.personality}
          </span>
          <span className="text-xs bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1 rounded-full">
            🌡 {settings.temperature}
          </span>
          <span className="text-xs bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1 rounded-full">
            {settings.theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </span>
          <span className="text-xs bg-blue-900/40 border border-blue-700/50 text-blue-300 px-3 py-1 rounded-full uppercase">
            🌐 {settings.language}
          </span>
          <span className="text-xs bg-purple-900/40 border border-purple-700/50 text-purple-300 px-3 py-1 rounded-full">
            {settings.units === "metric" ? "📏 Metric" : "📏 Imperial"}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full border ${
            settings.enableTools
              ? "bg-green-900/40 border-green-700/50 text-green-300"
              : "bg-red-900/40 border-red-700/50 text-red-300"
          }`}>
            {settings.enableTools ? `🛠️ ${settings.enabledTools.length} tools on` : "🛠️ Tools off"}
          </span>
        </div>

        {/* Save feedback */}
        {saveMessage && (
          <div className={`text-sm mt-3 px-4 py-2 rounded-lg border transition-all ${
            saveMsgType === "success"
              ? "text-green-400 bg-green-900/30 border-green-700/40"
              : "text-yellow-400 bg-yellow-900/30 border-yellow-700/40"
          }`}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-green-400 border-b-2 border-green-400"
                : "text-slate-400 hover:text-slate-200"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          GENERAL TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "general" && (
        <div className={cardCls}>
          <h2 className="text-base font-semibold border-b border-slate-700 pb-2">⚙️ General</h2>

          {/* Units */}
          <div>
            <label className="block mb-2 font-semibold text-sm">Units</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "metric",   label: "📏 Metric",   sub: "kg, cm, °C" },
                { value: "imperial", label: "📐 Imperial", sub: "lbs, ft, °F" },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("units", opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    settings.units === opt.value
                      ? "border-green-500 bg-green-900/20"
                      : "border-slate-600 bg-slate-700 hover:border-slate-500"
                  }`}>
                  <p className="font-semibold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-green-400 mt-1">✓ Applied instantly to Profile, Nutrition & Progress pages</p>
          </div>

          {/* Theme */}
          <div>
            <label className="block mb-2 font-semibold text-sm">Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "dark",  label: "🌙 Dark",  sub: "Easy on the eyes" },
                { value: "light", label: "☀️ Light", sub: "Clean & bright"   },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("theme", opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    settings.theme === opt.value
                      ? "border-green-500 bg-green-900/20"
                      : "border-slate-600 bg-slate-700 hover:border-slate-500"
                  }`}>
                  <p className="font-semibold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-green-400 mt-1">✓ Applied instantly to the whole app</p>
          </div>

          {/* Language */}
          <div>
            <label className="block mb-2 font-semibold text-sm">Language</label>
            <select value={settings.language} onChange={(e) => handleChange("language", e.target.value)} className={selectCls}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="text-xs text-green-400 mt-1">
              ✓ Sets page language & direction (Arabic = RTL). Place translation files in <code className="text-green-300">public/messages/</code>
            </p>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">Enable Notifications</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {notifStatus === "granted"     && "✅ Browser permission granted"}
                  {notifStatus === "denied"      && "🚫 Blocked — enable in browser settings"}
                  {notifStatus === "default"     && "Will request permission when toggled on"}
                  {notifStatus === "unsupported" && "❌ Not supported in this browser"}
                </p>
              </div>
              <Toggle checked={settings.notifications} onChange={(v) => handleChange("notifications", v)} />
            </div>
            {settings.notifications && notifStatus === "granted" && (
              <button onClick={sendTestNotification}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-600">
                🔔 Send Test Notification
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          AI MODEL TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ai" && (
        <div className={cardCls}>
          <h2 className="text-base font-semibold border-b border-slate-700 pb-2">🤖 AI Model</h2>

          {/* LLM */}
          <div>
            <label className="block mb-2 font-semibold text-sm">Language Model</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "openai",    label: "GPT-4",  sub: "OpenAI",    active: "border-green-500 bg-green-900/20"   },
                { value: "anthropic", label: "Claude", sub: "Anthropic", active: "border-purple-500 bg-purple-900/20" },
                { value: "google",    label: "Gemini", sub: "Google",    active: "border-blue-500 bg-blue-900/20"     },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("llm", opt.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    settings.llm === opt.value ? opt.active : "border-slate-600 bg-slate-700 hover:border-slate-500"
                  }`}>
                  <p className="font-bold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Takes effect on your next AI Coach message</p>
          </div>

          {/* Personality */}
          <div>
            <label className="block mb-2 font-semibold text-sm">Coach Personality</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "friendly", label: "😊 Friendly", sub: "Motivational"  },
                { value: "formal",   label: "👔 Formal",   sub: "Professional"  },
                { value: "concise",  label: "⚡ Concise",  sub: "Direct"        },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("personality", opt.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    settings.personality === opt.value
                      ? "border-green-500 bg-green-900/20"
                      : "border-slate-600 bg-slate-700 hover:border-slate-500"
                  }`}>
                  <p className="font-semibold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-sm">Temperature</label>
              <span className="font-mono text-green-400 text-sm">
                {settings.temperature}
                <span className="text-slate-500 text-xs ml-1">
                  — {settings.temperature < 0.4 ? "Focused" : settings.temperature < 0.7 ? "Balanced" : "Creative"}
                </span>
              </span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={settings.temperature}
              onChange={(e) => handleSlider("temperature", parseFloat(e.target.value))}
              className="w-full accent-green-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-0.5">
              <span>0 — Focused</span><span>0.5</span><span>1.0 — Creative</span>
            </div>
          </div>

          {/* Top P */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-sm">Top P</label>
              <span className="font-mono text-green-400 text-sm">{settings.topP}</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={settings.topP}
              onChange={(e) => handleSlider("topP", parseFloat(e.target.value))}
              className="w-full accent-green-500" />
            <p className="text-xs text-slate-500 mt-0.5">Controls vocabulary diversity (0 = narrow, 1 = wide)</p>
          </div>

          {/* Frequency Penalty */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-sm">Frequency Penalty</label>
              <span className="font-mono text-green-400 text-sm">{settings.frequencyPenalty}</span>
            </div>
            <input type="range" min={0} max={2} step={0.01} value={settings.frequencyPenalty}
              onChange={(e) => handleSlider("frequencyPenalty", parseFloat(e.target.value))}
              className="w-full accent-green-500" />
            <p className="text-xs text-slate-500 mt-0.5">Higher = less repetition in responses</p>
          </div>

          {/* Cache toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div>
              <p className="font-semibold text-sm">Enable Response Caching</p>
              <p className="text-xs text-slate-400">Reuses identical recent responses via Redis</p>
            </div>
            <Toggle checked={settings.enableCache} onChange={(v) => handleChange("enableCache", v)} />
          </div>

          {/* Tools master toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            settings.enableTools ? "bg-green-900/15 border-green-500/50" : "bg-red-900/15 border-red-500/50"
          }`}>
            <div>
              <p className="font-semibold text-sm">Enable AI Tools</p>
              <p className="text-xs text-slate-400">Master toggle — disables all tools when off</p>
            </div>
            <Toggle checked={settings.enableTools} onChange={(v) => handleChange("enableTools", v)} />
          </div>
          {!settings.enableTools && (
            <p className="text-yellow-400 text-xs bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
              ⚠️ All tools disabled — AI responds from knowledge only
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TOOLS & AGENTS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tools" && (
        <div className="flex flex-col gap-5">

          {/* Tools */}
          <div className={cardCls}>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h2 className="text-base font-semibold">🛠️ Available Tools</h2>
              <span className={`text-xs px-2 py-1 rounded-full border ${
                settings.enableTools
                  ? "bg-green-900/40 text-green-300 border-green-700/40"
                  : "bg-red-900/40 text-red-300 border-red-700/40"
              }`}>
                {settings.enableTools
                  ? `${settings.enabledTools.length}/${AVAILABLE_TOOLS.length} active`
                  : "⚠️ Master off"}
              </span>
            </div>
            <p className="text-xs text-slate-400">Toggle tools the AI Coach can call. Requires AI Tools master to be on.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isOn    = settings.enabledTools.includes(tool.id);
                const loading = toolLoading === tool.id;
                return (
                  <button key={tool.id} onClick={() => handleToolToggle(tool.id)}
                    disabled={loading || !settings.enableTools}
                    className={`flex items-center gap-3 rounded-lg p-3 border text-left transition-all w-full ${
                      !settings.enableTools
                        ? "opacity-40 cursor-not-allowed bg-slate-700/50 border-slate-600"
                        : isOn
                        ? "bg-green-900/15 border-green-500 hover:bg-green-900/25"
                        : "bg-slate-700 border-slate-600 hover:border-green-500"
                    }`}>
                    <span className="text-xl shrink-0">{loading ? "⏳" : tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-100 truncate">{tool.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${isOn ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"}`}>
                          {isOn ? "ON" : "OFF"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block">{tool.desc}</span>
                      <span className="text-xs text-slate-500">{tool.version}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agents */}
          <div className={cardCls}>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h2 className="text-base font-semibold">🤖 Available Agents</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40">
                {enabledAgents.length}/{AVAILABLE_AGENTS.length} active
              </span>
            </div>
            <p className="text-xs text-slate-400">The Supervisor routes queries to enabled agents only.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_AGENTS.map((agent) => {
                const isOn    = enabledAgents.includes(agent.id);
                const loading = agentLoading === agent.id;
                return (
                  <button key={agent.id} onClick={() => handleAgentToggle(agent.id)}
                    disabled={loading}
                    className={`flex items-center gap-3 rounded-lg p-3 border text-left transition-all w-full ${
                      isOn
                        ? "bg-blue-900/15 border-blue-500 hover:bg-blue-900/25"
                        : "bg-slate-700 border-slate-600 hover:border-blue-500"
                    }`}>
                    <span className="text-xl shrink-0">{loading ? "⏳" : agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-100 truncate">{agent.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${isOn ? "bg-blue-600 text-white" : "bg-slate-600 text-slate-300"}`}>
                          {isOn ? "ON" : "OFF"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block">{agent.desc}</span>
                      <span className="text-xs text-slate-500">{agent.version}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TOKEN USAGE TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tokens" && (
        <div className="flex flex-col gap-5">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Tokens",  value: tokenStats?.totalTokens.toLocaleString() ?? "0",    sub: "all messages",  color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-700/40",    icon: "🔢" },
              { label: "Total Cost",    value: `$${(tokenStats?.totalCost ?? 0).toFixed(4)}`,       sub: "USD estimated", color: "text-green-400",  bg: "bg-green-900/20 border-green-700/40",  icon: "💰" },
              { label: "Messages Sent", value: tokenStats?.totalMessages.toLocaleString() ?? "0",   sub: "AI Coach msgs", color: "text-purple-400", bg: "bg-purple-900/20 border-purple-700/40",icon: "💬" },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl p-4 border ${card.bg} text-center`}>
                <p className="text-2xl mb-1">{card.icon}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
                <p className="text-slate-500 text-xs">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* By model */}
          {tokenStats && Object.keys(tokenStats.byModel).length > 0 && (
            <div className={cardCls}>
              <h2 className="text-base font-semibold border-b border-slate-700 pb-2">📊 Usage by Model</h2>
              <div className="space-y-3">
                {Object.entries(tokenStats.byModel).map(([model, data]) => {
                  const pct = tokenStats.totalTokens > 0
                    ? Math.round((data.tokens / tokenStats.totalTokens) * 100) : 0;
                  return (
                    <div key={model}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-200">{MODEL_COSTS[model]?.label || model}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-slate-400">{data.tokens.toLocaleString()} tokens</span>
                          <span className="text-green-400 font-bold">${data.cost.toFixed(4)}</span>
                          <span className="text-slate-500">{data.messages} msgs</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pct}% of total</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing table */}
          <div className={cardCls}>
            <h2 className="text-base font-semibold border-b border-slate-700 pb-2">💲 Model Pricing</h2>
            <p className="text-xs text-slate-400 -mt-2">Cost per 1,000 tokens (USD)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Model</th>
                    <th className="text-right py-2 pr-4">Input /1K</th>
                    <th className="text-right py-2">Output /1K</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MODEL_COSTS).map(([key, info]) => (
                    <tr key={key} className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      (settings.llm === "openai"    && key.startsWith("gpt"))    ||
                      (settings.llm === "anthropic" && key.startsWith("claude")) ||
                      (settings.llm === "google"    && key.startsWith("gemini"))
                        ? "bg-green-900/10" : ""
                    }`}>
                      <td className="py-2 pr-4 text-slate-200 font-medium">{info.label}</td>
                      <td className="py-2 pr-4 text-right text-blue-400">${info.input.toFixed(5)}</td>
                      <td className="py-2 text-right text-green-400">${info.output.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">* Current model family highlighted. Prices approximate.</p>
          </div>

          {/* History */}
          <div className={cardCls}>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h2 className="text-base font-semibold">🕐 Message History</h2>
              {tokenStats && tokenStats.history.length > 0 && (
                <button onClick={clearTokenHistoryHandler}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-700/40 px-2 py-1 rounded-lg transition-colors">
                  Clear History
                </button>
              )}
            </div>
            {!tokenStats || tokenStats.history.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-slate-400 text-sm">No token usage recorded yet</p>
                <p className="text-slate-500 text-xs mt-1">Send a message to the AI Coach to start tracking</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tokenStats.history.slice(0, 20).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="text-slate-200 text-xs font-medium">{MODEL_COSTS[entry.model]?.label || entry.model}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 text-xs">{entry.promptTokens}↑ {entry.completionTokens}↓</p>
                      <p className="text-green-400 text-xs font-bold">${entry.cost.toFixed(5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ACCOUNT TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "account" && (
        <div className={cardCls}>
          <h2 className="text-base font-semibold border-b border-slate-700 pb-2">👤 Account</h2>

          {/* Account info */}
          <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 text-sm space-y-1.5">
            {[
              { label: "Name",     value: user?.name  || "—"                                                                       },
              { label: "Email",    value: user?.email || "—"                                                                       },
              { label: "Language", value: `${settings.language.toUpperCase()} — ${LANGUAGES.find((l) => l.code === settings.language)?.label}` },
              { label: "Theme",    value: settings.theme === "dark" ? "🌙 Dark" : "☀️ Light"                                       },
              { label: "Units",    value: settings.units === "metric" ? "Metric (kg/cm)" : "Imperial (lbs/ft)"                     },
              { label: "AI Model", value: settings.llm === "openai" ? "GPT-4" : settings.llm === "anthropic" ? "Claude" : "Gemini"},
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-slate-400">{row.label}</span>
                <span className="text-slate-200 font-medium">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Change password */}
          <form className="flex flex-col gap-3" onSubmit={handleChangePassword}>
            <label className="font-semibold text-sm border-b border-slate-700 pb-1">Change Password</label>
            <input type="password" placeholder="Current Password"
              value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              className={inputCls} required />
            <input type="password" placeholder="New Password (min 6 characters)"
              value={passwords.new} onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
              className={inputCls} required minLength={6} />
            <input type="password" placeholder="Confirm New Password"
              value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              className={inputCls} required />
            {pwNoMatch && <p className="text-red-400 text-xs">✗ Passwords do not match</p>}
            {pwsMatch  && <p className="text-green-400 text-xs">✓ Passwords match — ready to save</p>}
            <button type="submit"
              disabled={pwLoading || !passwords.current || !pwsMatch}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 text-sm">
              {pwLoading ? "Changing..." : "Change Password"}
            </button>
          </form>

          {/* Danger Zone — single block, no duplicate */}
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-red-400 font-semibold mb-1 text-sm">⚠️ Danger Zone</h3>
            <p className="text-xs text-slate-500 mb-3">
              Permanently deletes your account and ALL data. This cannot be undone.
            </p>
            {!showDeleteModal ? (
              <button onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm">
                🗑️ Delete Account
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 space-y-3">
                <p className="text-red-300 text-sm font-semibold">Are you absolutely sure? This is permanent.</p>
                <input type="password" placeholder="Enter your password to confirm"
                  value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  className={inputCls} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }}
                    className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleDeleteAccount}
                    disabled={deleteLoading || !deletePassword}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                    {deleteLoading ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}