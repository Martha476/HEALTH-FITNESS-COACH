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

const AVAILABLE_TOOLS = [
  { id: "generate_workout_plan", name: "Workout Plan Generator", desc: "Creates personalised workout plans.", icon: "💪", version: "v1.2" },
  { id: "calculate_nutrition",   name: "Nutrition Calculator",   desc: "Calculates daily nutrition needs.",  icon: "🥗", version: "v1.1" },
  { id: "analyze_progress",      name: "Progress Analyzer",      desc: "Tracks and analyzes progress.",      icon: "📈", version: "v1.0" },
  { id: "search_exercises",      name: "Exercise Search",        desc: "Finds exercises for your goals.",    icon: "🔍", version: "v1.0" },
  { id: "track_goals",           name: "Goal Tracker",           desc: "Monitors fitness goals.",            icon: "🎯", version: "v1.0" },
];

const AVAILABLE_AGENTS = [
  { id: "health_agent",     name: "Health Agent",     desc: "Health advice and metrics.",         icon: "🩺", version: "v2.0" },
  { id: "fitness_agent",    name: "Fitness Agent",    desc: "Workout guidance and routines.",     icon: "🏃", version: "v1.5" },
  { id: "nutrition_agent",  name: "Nutrition Agent",  desc: "Nutrition guidance and meal plans.", icon: "🍎", version: "v1.3" },
  { id: "progress_agent",   name: "Progress Agent",   desc: "Analyzes and visualizes progress.",  icon: "📊", version: "v1.1" },
  { id: "supervisor_agent", name: "Supervisor Agent", desc: "Coordinates all agents.",            icon: "👔", version: "v1.0" },
];

const LANGUAGES = [
  { code: "en", label: "🇺🇸 English"   },
  { code: "es", label: "🇪🇸 Español"   },
  { code: "fr", label: "🇫🇷 Français"  },
  { code: "de", label: "🇩🇪 Deutsch"   },
  { code: "zh", label: "🇨🇳 中文"      },
  { code: "ar", label: "🇸🇦 العربية"   },
  { code: "ru", label: "🇷🇺 Русский"   },
  { code: "pt", label: "🇧🇷 Português" },
  { code: "ja", label: "🇯🇵 日本語"    },
  { code: "hi", label: "🇮🇳 हिन्दी"    },
];

const MODEL_COSTS = getAllModelCosts();

export function getStoredSettings(): AgentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

const toBackendFormat = (s: AgentSettings) => ({
  llm: s.llm, temperature: s.temperature, topP: s.topP, top_p: s.topP,
  frequencyPenalty: s.frequencyPenalty, frequency_penalty: s.frequencyPenalty,
  personality: s.personality, enableCache: s.enableCache, enableTools: s.enableTools,
  enabledTools: s.enabledTools, units: s.units, notifications: s.notifications,
  theme: s.theme, language: s.language,
});

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark"); root.classList.remove("light");
    root.style.colorScheme = "dark";
    document.body.style.backgroundColor = "#0f172a";
    document.body.style.color = "#f8fafc";
  } else {
    root.classList.add("light"); root.classList.remove("dark");
    root.style.colorScheme = "light";
    document.body.style.backgroundColor = "#f0fdf4";
    document.body.style.color = "#042f2e";
  }
}

function applyLanguage(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
  window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_KEY, newValue: localStorage.getItem(SETTINGS_KEY) }));
}

function applyUnits(units: string) {
  localStorage.setItem("preferredUnits", units);
  window.dispatchEvent(new StorageEvent("storage", { key: "preferredUnits", newValue: units }));
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) { alert("This browser does not support notifications."); return false; }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") { alert("Notifications are blocked. Enable them in your browser site settings."); return false; }
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendTestNotification() {
  if (Notification.permission === "granted") {
    new Notification("FitCoach AI 🏋️", { body: "Notifications are enabled! You'll get workout reminders here.", icon: "/favicon.ico" });
  }
}

// ── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, size = "md" }: { checked: boolean; onChange: (v: boolean) => void; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const k = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const t = size === "sm" ? (checked ? "translate-x-5" : "translate-x-1") : (checked ? "translate-x-6" : "translate-x-1");
  return (
    <button onClick={() => onChange(!checked)} aria-checked={checked} role="switch"
      className={`relative inline-flex ${h} items-center rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${checked ? "bg-green-600" : "bg-slate-600"}`}>
      <span className={`inline-block ${k} transform rounded-full bg-white transition-transform shadow ${t}`} />
    </button>
  );
}

// ── Stat badge ─────────────────────────────────────────────────────────────
function StatBadge({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${color}`}>
      <span>{icon}</span>
      <span className="text-slate-300">{label}:</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Settings Page
// ═════════════════════════════════════════════════════════════════════════
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
  const [backendOnline,   setBackendOnline]   = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);

  const saveTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const sliderTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pingTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (!isLoading && !user) router.replace("/login"); }, [isLoading, user, router]);

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

  useEffect(() => {
    pingTimer.current = setInterval(pingBackend, 30000);
    return () => { if (pingTimer.current) clearInterval(pingTimer.current); };
  }, []);

  useEffect(() => {
    if (activeTab === "tokens" && user) {
      const token = getToken();
      if (token) {
        fetchTokenStatsFromBackend(token).then((stats) => {
          setTokenStats(stats ?? loadTokenStatsFromStorage(user.id));
        });
      } else {
        setTokenStats(loadTokenStatsFromStorage(user.id));
      }
    }
  }, [activeTab, user]);

  const getToken = () => localStorage.getItem("fitcoach_token");

  const pingBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      setBackendOnline(res.ok);
    } catch { setBackendOnline(false); }
  };

  const fetchSettings = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data   = await res.json();
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(toBackendFormat(merged)));
        applyTheme(merged.theme); applyLanguage(merged.language); applyUnits(merged.units);
      }
    } catch {}
  };

  const fetchAgents = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/settings/agents`, { headers: { Authorization: `Bearer ${token}` } });
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
    setSaveMessage(msg); setSaveMsgType(type);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveMessage(""), 2500);
  };

  const persistSettings = useCallback(async (updated: AgentSettings) => {
    setIsSaving(true);
    const payload = toBackendFormat(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
    applyTheme(updated.theme); applyLanguage(updated.language); applyUnits(updated.units);
    try {
      const token = getToken();
      if (!token) { showMsg("💾 Saved locally!", "local"); setIsSaving(false); return; }
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      showMsg(res.ok ? "✓ Settings saved!" : "💾 Saved locally!", res.ok ? "success" : "local");
    } catch { showMsg("💾 Saved locally!", "local"); }
    setIsSaving(false);
  }, []);

  const handleChange = async (field: keyof AgentSettings, value: any) => {
    if (field === "notifications" && value === true) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const updated = { ...settings, notifications: true };
      setSettings(updated); await persistSettings(updated); sendTestNotification(); return;
    }
    const updated = { ...settings, [field]: value };
    setSettings(updated); await persistSettings(updated);
  };

  const handleSlider = (field: keyof AgentSettings, value: number) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toBackendFormat(updated)));
    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    sliderTimer.current = setTimeout(() => persistSettings(updated), 400);
  };

  const handleToolToggle = async (toolId: string) => {
    if (!settings.enableTools) { showMsg("⚠️ Enable AI Tools first.", "local"); return; }
    setToolLoading(toolId);
    const updatedTools = settings.enabledTools.includes(toolId)
      ? settings.enabledTools.filter((t) => t !== toolId)
      : [...settings.enabledTools, toolId];
    const updated = { ...settings, enabledTools: updatedTools };
    setSettings(updated); await persistSettings(updated); setToolLoading(null);
  };

  const handleAgentToggle = async (agentId: string) => {
    setAgentLoading(agentId);
    const updated = enabledAgents.includes(agentId)
      ? enabledAgents.filter((a) => a !== agentId)
      : [...enabledAgents, agentId];
    setEnabledAgents(updated);
    localStorage.setItem("enabledAgents", JSON.stringify(updated));
    try {
      const token = getToken();
      if (token) await fetch(`${API_URL}/api/settings/agents`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabledAgents: updated }),
      });
    } catch {}
    setAgentLoading(null); showMsg("✓ Agent updated!");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) { showMsg("❌ Passwords do not match.", "local"); return; }
    if (passwords.new.length < 6)            { showMsg("❌ Minimum 6 characters.", "local"); return; }
    setPwLoading(true);
    try {
      const token = getToken();
      const res   = await fetch(`${API_URL}/api/auth/update-password`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user?.email, old_password: passwords.current, new_password: passwords.new }),
      });
      if (res.ok) { showMsg("✓ Password changed!"); setPasswords({ current: "", new: "", confirm: "" }); }
      else         { const d = await res.json(); showMsg(`❌ ${d.detail || "Failed."}`, "local"); }
    } catch { showMsg("❌ Failed to change password.", "local"); }
    setPwLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { showMsg("❌ Enter your password to confirm.", "local"); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/delete-account`, {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: user?.email, password: deletePassword }),
      });
      if (res.ok) { localStorage.clear(); window.location.href = "/login"; }
      else { showMsg("❌ Failed. Check your password.", "local"); setDeleteLoading(false); }
    } catch { showMsg("❌ Failed to delete account.", "local"); setDeleteLoading(false); }
  };

  const clearTokenHistoryHandler = () => {
    if (!user || !window.confirm("Clear all token usage history?")) return;
    clearTokenHistory(user.id, getToken());
    setTokenStats({ totalTokens: 0, totalCost: 0, totalMessages: 0, history: [], byModel: {} });
    showMsg("✓ Token history cleared!");
  };

  const pwsMatch  = passwords.new && passwords.confirm && passwords.new === passwords.confirm && passwords.new.length >= 6;
  const pwNoMatch = passwords.new && passwords.confirm && passwords.new !== passwords.confirm;
  const notifStatus = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
  const toolsActive = settings.enableTools ? settings.enabledTools.length : 0;

  const selectCls = "p-2.5 border border-slate-600 rounded-xl w-full bg-slate-700/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-colors";
  const inputCls  = "p-2.5 border border-slate-600 rounded-xl w-full bg-slate-700/80 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-colors";
  const cardCls   = "bg-slate-800/60 backdrop-blur-sm text-slate-100 rounded-2xl shadow-lg p-6 flex flex-col gap-5 border border-slate-700/50";
  const sectionTitle = "text-base font-bold text-white pb-2 border-b border-slate-700/60 flex items-center gap-2";

  const tabs = [
    { id: "general", label: "General",       icon: "⚙️" },
    { id: "ai",      label: "AI Model",      icon: "🤖" },
    { id: "tools",   label: "Tools",         icon: "🛠️" },
    { id: "tokens",  label: "Token Usage",   icon: "📊" },
    { id: "account", label: "Account",       icon: "👤" },
  ] as const;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading settings...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* ── Clean header card ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 p-6 shadow-xl">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${backendOnline ? "bg-green-400" : "bg-slate-500"}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{user?.name || "Settings"}</h1>
            <p className="text-slate-400 text-sm truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${backendOnline ? "bg-green-900/50 text-green-300 border border-green-700/40" : "bg-slate-700 text-slate-400 border border-slate-600"}`}>
                {backendOnline ? "● Online" : "● Offline"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-medium">
                {settings.llm === "openai" ? "GPT-4" : settings.llm === "anthropic" ? "Claude" : "Gemini"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-medium capitalize">
                {settings.theme === "dark" ? "🌙" : "☀️"} {settings.theme}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-medium">
                {settings.units === "metric" ? "📏 Metric" : "📐 Imperial"}
              </span>
              {toolsActive > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-700/40 font-medium">
                  🛠️ {toolsActive} tools
                </span>
              )}
            </div>
          </div>

          {/* Save indicator */}
          <div className="shrink-0">
            {isSaving ? (
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : saveMessage ? (
              <div className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                saveMsgType === "success"
                  ? "text-green-400 bg-green-900/30 border-green-700/40"
                  : "text-amber-400 bg-amber-900/30 border-amber-700/40"
              }`}>
                {saveMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-green-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}>
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          GENERAL TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "general" && (
        <div className={cardCls}>
          <h2 className={sectionTitle}>⚙️ General Settings</h2>

          {/* Units */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-200">Measurement Units</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "metric",   label: "📏 Metric",   sub: "kg · cm · °C", color: "border-blue-500 bg-blue-900/20" },
                { value: "imperial", label: "📐 Imperial", sub: "lbs · ft · °F", color: "border-orange-500 bg-orange-900/20" },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("units", opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    settings.units === opt.value ? opt.color : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                  }`}>
                  <p className="font-bold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
                  {settings.units === opt.value && <p className="text-xs text-green-400 mt-1">✓ Active</p>}
                </button>
              ))}
            </div>
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <span>✓</span> Applied instantly across Profile, Nutrition & Progress
            </p>
          </div>

          {/* Theme */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-200">App Theme</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "dark",  label: "🌙 Dark",  sub: "Easy on the eyes",  color: "border-slate-400 bg-slate-700/50" },
                { value: "light", label: "☀️ Light", sub: "Clean & bright",    color: "border-yellow-500 bg-yellow-900/20" },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("theme", opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    settings.theme === opt.value ? opt.color : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                  }`}>
                  <p className="font-bold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
                  {settings.theme === opt.value && <p className="text-xs text-green-400 mt-1">✓ Active</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-200">Language</label>
            <select value={settings.language} onChange={(e) => handleChange("language", e.target.value)} className={selectCls}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <span>✓</span> Sets page language & text direction (Arabic = RTL)
            </p>
          </div>

          {/* Notifications */}
          <div className={`p-4 rounded-xl border transition-all ${
            settings.notifications ? "bg-green-900/20 border-green-500/50" : "bg-slate-700/30 border-slate-600"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-slate-100">🔔 Push Notifications</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {notifStatus === "granted"     && "✅ Permission granted"}
                  {notifStatus === "denied"      && "🚫 Blocked in browser settings"}
                  {notifStatus === "default"     && "Permission will be requested"}
                  {notifStatus === "unsupported" && "❌ Not supported in this browser"}
                </p>
              </div>
              <Toggle checked={settings.notifications} onChange={(v) => handleChange("notifications", v)} />
            </div>
            {settings.notifications && notifStatus === "granted" && (
              <button onClick={sendTestNotification}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-600 mt-1">
                🔔 Send Test Notification
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AI MODEL TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "ai" && (
        <div className={cardCls}>
          <h2 className={sectionTitle}>🤖 AI Model Configuration</h2>

          {/* LLM */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-200">Language Model</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "openai",    label: "GPT-4",  sub: "OpenAI",    color: "border-emerald-500 bg-emerald-900/20", dot: "bg-emerald-400" },
                { value: "anthropic", label: "Claude", sub: "Anthropic", color: "border-purple-500 bg-purple-900/20",   dot: "bg-purple-400"  },
                { value: "google",    label: "Gemini", sub: "Google",    color: "border-blue-500 bg-blue-900/20",       dot: "bg-blue-400"    },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("llm", opt.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                    settings.llm === opt.value ? opt.color : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                  }`}>
                  {settings.llm === opt.value && <div className={`w-2 h-2 rounded-full ${opt.dot} mx-auto mb-1`} />}
                  <p className="font-bold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Takes effect on your next AI Coach message</p>
          </div>

          {/* Personality */}
          <div>
            <label className="block mb-2 font-semibold text-sm text-slate-200">Coach Personality</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "friendly", label: "😊 Friendly", sub: "Motivational"  },
                { value: "formal",   label: "👔 Formal",   sub: "Professional"  },
                { value: "concise",  label: "⚡ Concise",  sub: "Direct"        },
              ].map((opt) => (
                <button key={opt.value} onClick={() => handleChange("personality", opt.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                    settings.personality === opt.value
                      ? "border-green-500 bg-green-900/20"
                      : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                  }`}>
                  <p className="font-semibold text-sm text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          {[
            { field: "temperature" as const, label: "Temperature", min: 0, max: 1, step: 0.01,
              hint: settings.temperature < 0.4 ? "Focused & precise" : settings.temperature < 0.7 ? "Balanced" : "Creative & varied",
              desc: "Controls creativity (0 = focused, 1 = creative)" },
            { field: "topP" as const, label: "Top P", min: 0, max: 1, step: 0.01,
              hint: `${settings.topP}`, desc: "Controls vocabulary diversity (0 = narrow, 1 = wide)" },
            { field: "frequencyPenalty" as const, label: "Frequency Penalty", min: 0, max: 2, step: 0.01,
              hint: `${settings.frequencyPenalty}`, desc: "Higher = less repetition in responses" },
          ].map(({ field, label, min, max, step, hint, desc }) => (
            <div key={field}>
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-sm text-slate-200">{label}</label>
                <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded-lg text-green-400">
                  {settings[field]} <span className="text-slate-500 ml-1">{hint !== String(settings[field]) ? `— ${hint}` : ""}</span>
                </span>
              </div>
              <input type="range" min={min} max={max} step={step} value={settings[field]}
                onChange={(e) => handleSlider(field, parseFloat(e.target.value))}
                className="w-full accent-green-500 cursor-pointer" />
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
          ))}

          {/* Toggles */}
          <div className="space-y-3">
            {[
              { field: "enableCache" as const,  label: "Response Caching", desc: "Reuses identical recent responses via Redis", icon: "⚡" },
              { field: "enableTools" as const,  label: "AI Tools Master",  desc: "Master switch — disables all tools when off",  icon: "🛠️" },
            ].map(({ field, label, desc, icon }) => (
              <div key={field} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                settings[field] ? "bg-green-900/15 border-green-500/50" : "bg-slate-700/30 border-slate-600"
              }`}>
                <div>
                  <p className="font-semibold text-sm text-slate-100">{icon} {label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={settings[field]} onChange={(v) => handleChange(field, v)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TOOLS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "tools" && (
        <div className="space-y-5">
          {/* Tools */}
          <div className={cardCls}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <h2 className="font-bold text-white flex items-center gap-2">🛠️ Available Tools</h2>
              <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${
                settings.enableTools
                  ? "bg-green-900/40 text-green-300 border-green-700/40"
                  : "bg-red-900/40 text-red-300 border-red-700/40"
              }`}>
                {settings.enableTools ? `${settings.enabledTools.length}/${AVAILABLE_TOOLS.length} active` : "Master off"}
              </span>
            </div>
            {!settings.enableTools && (
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-amber-300 text-xs">
                ⚠️ AI Tools master switch is off. Enable it in the AI Model tab to use tools.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isOn    = settings.enabledTools.includes(tool.id);
                const loading = toolLoading === tool.id;
                return (
                  <button key={tool.id} onClick={() => handleToolToggle(tool.id)}
                    disabled={loading || !settings.enableTools}
                    className={`flex items-center gap-3 rounded-xl p-4 border-2 text-left transition-all w-full ${
                      !settings.enableTools ? "opacity-40 cursor-not-allowed bg-slate-700/30 border-slate-700"
                      : isOn ? "bg-green-900/20 border-green-500 hover:bg-green-900/30"
                      : "bg-slate-700/30 border-slate-600 hover:border-green-500/50 hover:bg-slate-700/50"
                    }`}>
                    <span className="text-2xl shrink-0">{loading ? "⏳" : tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-100 truncate">{tool.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold ${
                          isOn ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"
                        }`}>
                          {isOn ? "ON" : "OFF"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{tool.desc}</p>
                      <p className="text-xs text-slate-500">{tool.version}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agents */}
          <div className={cardCls}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <h2 className="font-bold text-white flex items-center gap-2">🤖 Available Agents</h2>
              <span className="text-xs px-3 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40 font-semibold">
                {enabledAgents.length}/{AVAILABLE_AGENTS.length} active
              </span>
            </div>
            <p className="text-xs text-slate-400">The Supervisor routes queries to enabled agents only.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_AGENTS.map((agent) => {
                const isOn    = enabledAgents.includes(agent.id);
                const loading = agentLoading === agent.id;
                return (
                  <button key={agent.id} onClick={() => handleAgentToggle(agent.id)} disabled={loading}
                    className={`flex items-center gap-3 rounded-xl p-4 border-2 text-left transition-all w-full ${
                      isOn
                        ? "bg-blue-900/20 border-blue-500 hover:bg-blue-900/30"
                        : "bg-slate-700/30 border-slate-600 hover:border-blue-500/50 hover:bg-slate-700/50"
                    }`}>
                    <span className="text-2xl shrink-0">{loading ? "⏳" : agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-100 truncate">{agent.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold ${
                          isOn ? "bg-blue-600 text-white" : "bg-slate-600 text-slate-300"
                        }`}>
                          {isOn ? "ON" : "OFF"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{agent.desc}</p>
                      <p className="text-xs text-slate-500">{agent.version}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TOKEN USAGE TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "tokens" && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Tokens",  value: tokenStats?.totalTokens.toLocaleString() ?? "0",   icon: "🔢", color: "from-blue-900/40 to-blue-800/20 border-blue-700/40",   textColor: "text-blue-300"   },
              { label: "Total Cost",    value: `$${(tokenStats?.totalCost ?? 0).toFixed(4)}`,      icon: "💰", color: "from-green-900/40 to-green-800/20 border-green-700/40", textColor: "text-green-300"  },
              { label: "Messages",      value: tokenStats?.totalMessages.toLocaleString() ?? "0",  icon: "💬", color: "from-purple-900/40 to-purple-800/20 border-purple-700/40",textColor: "text-purple-300"},
            ].map((card) => (
              <div key={card.label} className={`rounded-2xl p-4 border bg-gradient-to-br ${card.color} text-center`}>
                <p className="text-2xl mb-2">{card.icon}</p>
                <p className={`text-xl font-bold ${card.textColor}`}>{card.value}</p>
                <p className="text-slate-400 text-xs mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* By model */}
          {tokenStats && Object.keys(tokenStats.byModel).length > 0 && (
            <div className={cardCls}>
              <h2 className={sectionTitle}>📊 Usage by Model</h2>
              <div className="space-y-4">
                {Object.entries(tokenStats.byModel).map(([model, data]) => {
                  const pct = tokenStats.totalTokens > 0 ? Math.round((data.tokens / tokenStats.totalTokens) * 100) : 0;
                  return (
                    <div key={model}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-bold text-slate-200">{MODEL_COSTS[model]?.label || model}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-slate-400">{data.tokens.toLocaleString()} tokens</span>
                          <span className="text-green-400 font-bold">${data.cost.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pct}% of total · {data.messages} messages</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className={cardCls}>
            <h2 className={sectionTitle}>💲 Model Pricing</h2>
            <p className="text-xs text-slate-400 -mt-3">Cost per 1,000 tokens (USD)</p>
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs">
                    <th className="text-left px-4 py-3">Model</th>
                    <th className="text-right px-4 py-3">Input /1K</th>
                    <th className="text-right px-4 py-3">Output /1K</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MODEL_COSTS).map(([key, info]) => {
                    const active =
                      (settings.llm === "openai"    && key.startsWith("gpt"))    ||
                      (settings.llm === "anthropic" && key.startsWith("claude")) ||
                      (settings.llm === "google"    && key.startsWith("gemini"));
                    return (
                      <tr key={key} className={`border-t border-slate-700/50 transition-colors ${active ? "bg-green-900/10" : "hover:bg-slate-700/20"}`}>
                        <td className="px-4 py-3 text-slate-200 font-medium flex items-center gap-2">
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                          {info.label}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-400">${info.input.toFixed(5)}</td>
                        <td className="px-4 py-3 text-right text-green-400">${info.output.toFixed(5)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* History */}
          <div className={cardCls}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <h2 className="font-bold text-white">🕐 Recent Messages</h2>
              {tokenStats && tokenStats.history.length > 0 && (
                <button onClick={clearTokenHistoryHandler}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-700/40 px-3 py-1 rounded-lg transition-colors hover:bg-red-900/20">
                  Clear History
                </button>
              )}
            </div>
            {!tokenStats || tokenStats.history.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-4xl">📭</p>
                <p className="text-slate-400 text-sm">No token usage recorded yet</p>
                <p className="text-slate-500 text-xs">Send a message to the AI Coach to start tracking</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tokenStats.history.slice(0, 20).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-slate-700/40 rounded-xl border border-slate-700/30 hover:bg-slate-700/60 transition-colors">
                    <div>
                      <p className="text-slate-200 text-xs font-semibold">{MODEL_COSTS[entry.model]?.label || entry.model}</p>
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

      {/* ══════════════════════════════════════════════════════════════════
          ACCOUNT TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "account" && (
        <div className={cardCls}>
          <h2 className={sectionTitle}>👤 Account Settings</h2>

          {/* Account info */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/50 space-y-2">
            {[
              { label: "Name",     value: user?.name  || "—" },
              { label: "Email",    value: user?.email || "—" },
              { label: "Language", value: LANGUAGES.find((l) => l.code === settings.language)?.label || settings.language },
              { label: "Theme",    value: settings.theme === "dark" ? "🌙 Dark" : "☀️ Light" },
              { label: "Units",    value: settings.units === "metric" ? "📏 Metric (kg/cm)" : "📐 Imperial (lbs/ft)" },
              { label: "AI Model", value: settings.llm === "openai" ? "GPT-4" : settings.llm === "anthropic" ? "Claude" : "Gemini" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-1 border-b border-slate-600/30 last:border-0">
                <span className="text-slate-400 text-sm">{row.label}</span>
                <span className="text-slate-200 font-semibold text-sm">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Change password */}
          <div>
            <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">🔑 Change Password</h3>
            <form className="space-y-3" onSubmit={handleChangePassword}>
              {[
                { key: "current", placeholder: "Current Password" },
                { key: "new",     placeholder: "New Password (min 6 characters)" },
                { key: "confirm", placeholder: "Confirm New Password" },
              ].map(({ key, placeholder }) => (
                <input key={key} type="password" placeholder={placeholder} required
                  value={passwords[key as keyof typeof passwords]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                  minLength={key !== "current" ? 6 : undefined}
                  className={inputCls} />
              ))}
              {pwNoMatch && <p className="text-red-400 text-xs flex items-center gap-1">✗ Passwords do not match</p>}
              {pwsMatch  && <p className="text-green-400 text-xs flex items-center gap-1">✓ Passwords match</p>}
              <button type="submit" disabled={pwLoading || !passwords.current || !pwsMatch}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm">
                {pwLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-red-900/40">
            <h3 className="text-red-400 font-bold mb-1 text-sm flex items-center gap-2">⚠️ Danger Zone</h3>
            <p className="text-xs text-slate-500 mb-3">Permanently deletes your account and all data. This cannot be undone.</p>
            {!showDeleteModal ? (
              <button onClick={() => setShowDeleteModal(true)}
                className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-700/50 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm">
                🗑️ Delete Account
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 space-y-3">
                <p className="text-red-300 text-sm font-semibold">Are you absolutely sure? This is permanent.</p>
                <input type="password" placeholder="Enter your password to confirm"
                  value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  className={inputCls} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleDeleteAccount} disabled={deleteLoading || !deletePassword}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
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