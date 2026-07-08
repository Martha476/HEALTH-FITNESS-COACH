"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  name:                 string;
  gender:               string;
  age:                  number;
  height:               string;
  currentWeight:        number;
  startWeight:          number;   // ← NEW: saved once on first profile creation
  targetWeight:         number;
  bodyFat:              number;
  preferredUnit:        string;
  primaryGoal:          string;
  targetDate:           string;
  activityLevel:        string;
  dailyCalorieGoal:     number;
  dietaryType:          string;
  foodAllergies:        string;
  mealsPerDay:          number;
  experienceLevel:      string;
  preferredWorkoutType: string;
  availableEquipment:   string;
  workoutDaysPerWeek:   number;
  workoutDuration:      string;
  injuries:             string;
  medicalConditions:    string;
}

const EMPTY_PROFILE: Profile = {
  name: "", gender: "", age: 0, height: "",
  currentWeight: 0, startWeight: 0, targetWeight: 0, bodyFat: 0,
  preferredUnit: "metric", primaryGoal: "", targetDate: "",
  activityLevel: "", dailyCalorieGoal: 0, dietaryType: "no-restriction",
  foodAllergies: "", mealsPerDay: 3, experienceLevel: "",
  preferredWorkoutType: "", availableEquipment: "",
  workoutDaysPerWeek: 3, workoutDuration: "45min",
  injuries: "", medicalConditions: "",
};

const REQUIRED_FIELDS: (keyof Profile)[] = [
  "name", "gender", "age", "height",
  "currentWeight", "primaryGoal", "activityLevel", "experienceLevel",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SaveStatus = "idle" | "saving" | "success" | "error";

const BASE_CLS =
  "w-full px-4 py-3 bg-slate-700 border-2 rounded-lg text-slate-100 " +
  "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 " +
  "disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed " +
  "disabled:border-slate-700 transition-colors duration-200";

// ─── Sub-components (defined outside to prevent remount on rerender) ──────────

interface FieldHintProps { show: boolean; isValid: boolean; }
function FieldHint({ show, isValid }: FieldHintProps) {
  if (!show) return null;
  return isValid
    ? <p className="text-green-400 text-xs mt-1">✓ Looks good!</p>
    : <p className="text-red-400 text-xs mt-1">⚠ Required field</p>;
}

interface InputFieldProps {
  label: string; field: keyof Profile; type?: string;
  placeholder?: string; required?: boolean; value: any;
  disabled: boolean; borderCls: string; showHint: boolean;
  isValid: boolean; onChange: (field: keyof Profile, value: any) => void;
}
function InputField({ label, field, type = "text", placeholder = "", required = false,
  value, disabled, borderCls, showHint, isValid, onChange }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={type === "number" && value === 0 ? "" : value}
        onChange={(e) => onChange(field,
          type === "number"
            ? e.target.value === "" ? 0 : parseFloat(e.target.value)
            : e.target.value
        )}
        disabled={disabled}
        placeholder={disabled ? "" : placeholder}
        className={`${BASE_CLS} ${borderCls}`}
      />
      <FieldHint show={showHint} isValid={isValid} />
    </div>
  );
}

interface SelectFieldProps {
  label: string; field: keyof Profile;
  options: { value: string; label: string }[];
  required?: boolean; value: any; disabled: boolean;
  borderCls: string; showHint: boolean; isValid: boolean;
  onChange: (field: keyof Profile, value: any) => void;
}
function SelectField({ label, field, options, required = false,
  value, disabled, borderCls, showHint, isValid, onChange }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled} className={`${BASE_CLS} ${borderCls}`}>
        <option value="" disabled>Select {label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldHint show={showHint} isValid={isValid} />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string; field: keyof Profile; placeholder?: string;
  rows?: number; value: any; disabled: boolean;
  onChange: (field: keyof Profile, value: any) => void;
}
function TextAreaField({ label, field, placeholder = "", rows = 3,
  value, disabled, onChange }: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
      <textarea value={value} onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled} placeholder={disabled ? "" : placeholder}
        rows={rows} className={`${BASE_CLS} border-slate-600 resize-y`} />
    </div>
  );
}

interface SectionProps { icon: string; title: string; sub: string; children: React.ReactNode; }
function Section({ icon, title, sub, children }: SectionProps) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 mb-6 border border-slate-700 shadow-lg">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        <p className="text-slate-400 text-sm mt-1">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// ─── BMI calculation — unit-aware ─────────────────────────────────────────────
function calcBMI(weight: number, heightStr: string, unit: string): number {
  if (!weight || !heightStr) return 0;
  if (unit === "metric") {
    // height in cm
    const cm = parseFloat(heightStr.replace(/[^0-9.]/g, ""));
    if (!cm) return 0;
    const m = cm / 100;
    return Math.round((weight / (m * m)) * 10) / 10;
  } else {
    // height in ft'in or total inches
    let inches = 0;
    const feetMatch = heightStr.match(/(\d+)'(\d*)/);
    if (feetMatch) {
      inches = parseInt(feetMatch[1]) * 12 + (parseInt(feetMatch[2]) || 0);
    } else {
      inches = parseFloat(heightStr.replace(/[^0-9.]/g, "")) || 0;
    }
    if (!inches) return 0;
    return Math.round(((weight / (inches * inches)) * 703) * 10) / 10;
  }
}

// ─── Calorie calculation ──────────────────────────────────────────────────────
function calcCalories(profile: Profile): number {
  if (!profile.age || !profile.currentWeight || !profile.activityLevel) return 0;
  const multipliers: Record<string, number> = {
    sedentary: 1.2, "lightly-active": 1.375,
    "moderately-active": 1.55, "very-active": 1.725, athlete: 1.9,
  };

  // Convert weight to kg for Mifflin-St Jeor
  const weightKg = profile.preferredUnit === "metric"
    ? profile.currentWeight
    : profile.currentWeight * 0.453592;

  // Estimate height in cm
  let heightCm = 170; // fallback
  if (profile.height) {
    if (profile.preferredUnit === "metric") {
      heightCm = parseFloat(profile.height.replace(/[^0-9.]/g, "")) || 170;
    } else {
      const fm = profile.height.match(/(\d+)'(\d*)/);
      const totalIn = fm
        ? parseInt(fm[1]) * 12 + (parseInt(fm[2]) || 0)
        : parseFloat(profile.height.replace(/[^0-9.]/g, "")) || 67;
      heightCm = totalIn * 2.54;
    }
  }

  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age;
  if (profile.gender === "male")   bmr += 5;
  if (profile.gender === "female") bmr -= 161;

  let cal = bmr * (multipliers[profile.activityLevel] || 1.2);
  const g = profile.primaryGoal;
  if (["lose-weight", "weight-loss"].includes(g)) cal -= 500;
  else if (["build-muscle", "muscle-gain", "lower-body-strength", "glute-strength"].includes(g)) cal += 300;

  return Math.round(cal);
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { user, isLoading, getAuthHeaders, getUserKey } = useAuth();
  const router = useRouter();

  const [profile,            setProfile]            = useState<Profile>(EMPTY_PROFILE);
  const [isEditing,          setIsEditing]          = useState(true);
  const [isNewUser,          setIsNewUser]          = useState(true);
  const [saveStatus,         setSaveStatus]         = useState<SaveStatus>("idle");
  const [saveMessage,        setSaveMessage]        = useState("");
  const [calculatedBMI,      setCalculatedBMI]      = useState(0);
  const [calculatedCalories, setCalculatedCalories] = useState(0);
  const [dirtyFields,        setDirtyFields]        = useState<Set<keyof Profile>>(new Set());
  const [saveAttempted,      setSaveAttempted]      = useState(false);
  const [redirectCountdown,  setRedirectCountdown]  = useState(0);
  const [profileLoaded,      setProfileLoaded]      = useState(false);
  const [isOAuthRedirect,    setIsOAuthRedirect]    = useState(false); // Added for Google OAuth

  // ✅ FIXED: Redirect logic - only redirect if no token and no user
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!isLoading && !user && !token) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // ✅ NEW: Sync user from localStorage if AuthContext hasn't loaded yet
  useEffect(() => {
    if (!isLoading && !user) {
      const token = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("user");
      
      if (token && storedUser && !user) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log("User found in localStorage but not in AuthContext:", parsedUser);
          // Force a page reload to let AuthContext pick up the user
          if (window.location.pathname === "/profile") {
            setTimeout(() => {
              if (!user) {
                window.location.reload();
              }
            }, 500);
          }
        } catch (e) {
          console.error("Failed to parse stored user:", e);
        }
      }
    }
  }, [isLoading, user]);

  // ✅ NEW: Handle Google OAuth redirect state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isNewFromGoogle = urlParams.get('new') === 'true';
    const hasToken = !!localStorage.getItem("authToken");
    
    if (isNewFromGoogle && hasToken && !user) {
      setIsOAuthRedirect(true);
      // Wait for AuthContext to load the user
      const interval = setInterval(() => {
        if (user) {
          setIsOAuthRedirect(false);
          clearInterval(interval);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(interval);
        setIsOAuthRedirect(false);
        if (!user) {
          window.location.reload();
        }
      }, 5000);
    }
  }, [user]);

  // Check if this is a new user from Google sign-in
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isNewFromGoogle = urlParams.get('new') === 'true';
    
    if (isNewFromGoogle) {
      setIsNewUser(true);
      setIsEditing(true);
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  // Load profile ONLY on mount or when user.id changes
  useEffect(() => {
    if (!user || profileLoaded) return;
    
    let isMounted = true;
    let loadTimeout: NodeJS.Timeout;
    
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile/${user.id}`, { 
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(10000)
        });
        
        if (!isMounted) return;
        
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 2) {
            setProfile({ ...EMPTY_PROFILE, name: user.name || "", ...data });
            setIsNewUser(false); 
            setIsEditing(false);
            setProfileLoaded(true);
            return;
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.log("API load failed, checking localStorage");
      }

      if (!isMounted) return;
      
      const scoped = localStorage.getItem(getUserKey("userProfile"));
      if (scoped) {
        try {
          const savedProfile = JSON.parse(scoped);
          setProfile({ ...EMPTY_PROFILE, ...savedProfile });
          setIsNewUser(false); 
          setIsEditing(false);
          setProfileLoaded(true);
          return;
        } catch {}
      }

      setProfile({ ...EMPTY_PROFILE, name: user.name || "" });
      setIsNewUser(true); 
      setIsEditing(true);
      setDirtyFields(new Set()); 
      setSaveAttempted(false);
      setSaveStatus("idle"); 
      setSaveMessage("");
      setProfileLoaded(true);
    };
    
    loadTimeout = setTimeout(loadProfile, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(loadTimeout);
    };
  }, [user?.id]);

  // Recalculate BMI + calories whenever profile changes
  useEffect(() => {
    setCalculatedBMI(calcBMI(profile.currentWeight, profile.height, profile.preferredUnit));
    setCalculatedCalories(calcCalories(profile));
  }, [profile.currentWeight, profile.height, profile.preferredUnit,
      profile.age, profile.gender, profile.activityLevel, profile.primaryGoal]);

  // Warn user if they try to leave with unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = dirtyFields.size > 0 && isEditing;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [dirtyFields, isEditing]);

  // Redirect countdown
  useEffect(() => {
    if (redirectCountdown <= 0) return;
    if (redirectCountdown === 1) { 
      router.push("/dashboard"); 
      return; 
    }
    const t = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [redirectCountdown]);

  const isFieldValid = useCallback((field: keyof Profile) => {
    if (!REQUIRED_FIELDS.includes(field)) return true;
    const v = profile[field];
    return typeof v === "number" ? v > 0 : !!v;
  }, [profile]);

  const getBorderCls = useCallback((field: keyof Profile, required = false) => {
    if (!isEditing) return "border-slate-700";
    if (!required)  return "border-slate-600";
    const show = saveAttempted || dirtyFields.has(field);
    if (!show) return "border-slate-600";
    return isFieldValid(field) ? "border-green-500" : "border-red-500";
  }, [isEditing, saveAttempted, dirtyFields, isFieldValid]);

  const getShowHint = useCallback((field: keyof Profile) =>
    saveAttempted || dirtyFields.has(field), [saveAttempted, dirtyFields]);

  const handleFieldChange = useCallback((field: keyof Profile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setDirtyFields((prev) => new Set([...prev, field]));
  }, []);

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true); 
      setDirtyFields(new Set());
      setSaveAttempted(false); 
      setSaveStatus("idle"); 
      setSaveMessage(""); 
      return;
    }

    setSaveAttempted(true);
    setDirtyFields(new Set(REQUIRED_FIELDS));

    const missing = REQUIRED_FIELDS.filter((f) => !isFieldValid(f));
    if (missing.length > 0) {
      setSaveStatus("error");
      setSaveMessage(`Please fill in: ${missing
        .map((f) => f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()))
        .join(", ")}`);
      window.scrollTo({ top: 0, behavior: "smooth" }); 
      return;
    }

    setSaveStatus("saving"); 
    setSaveMessage("Saving your profile...");

    const existingStart = profile.startWeight;
    const toSave: Profile = {
      ...profile,
      dailyCalorieGoal: profile.dailyCalorieGoal === 0 && calculatedCalories > 0
        ? calculatedCalories : profile.dailyCalorieGoal,
      startWeight: existingStart > 0 ? existingStart : profile.currentWeight,
    };

    setProfile(toSave);

    if (!user) { 
      setSaveStatus("error"); 
      setSaveMessage("❌ Not logged in."); 
      return; 
    }

    localStorage.setItem(getUserKey("userProfile"), JSON.stringify(toSave));
    localStorage.setItem("userProfile", JSON.stringify(toSave));
    localStorage.setItem("profileComplete", "true");

    let backendSaved = false;
    try {
      const res = await fetch(`${API_URL}/api/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(toSave),
        signal: AbortSignal.timeout(5000),
      });
      backendSaved = res.ok;
    } catch (err) { 
      console.log("Backend save failed or timed out, local save preserved");
      backendSaved = false; 
    }

    if (saveStatus === "saving") {
      setIsEditing(false); 
      setIsNewUser(false);
      setSaveStatus("success");
      setSaveMessage(backendSaved
        ? isNewUser ? "🎉 Profile created! Redirecting..." : "✅ Profile updated!"
        : "✅ Profile saved locally!");
      
      setRedirectCountdown(1);
    }
  };

  const completedCount = REQUIRED_FIELDS.filter(isFieldValid).length;
  const progress = Math.round((completedCount / REQUIRED_FIELDS.length) * 100);

  const weightLabel = profile.preferredUnit === "metric" ? "kg" : "lbs";
  const heightLabel = profile.preferredUnit === "metric" ? "cm" : "ft/in";

  // ✅ Updated loading check to include OAuth redirect state
  if (isOAuthRedirect || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-4xl mx-auto">

        {/* Success banner */}
        {saveStatus === "success" && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-2 border-green-500/60 p-5 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">🎉</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-green-300 mb-1">
                  {isNewUser ? "Welcome to FitCoach AI!" : "Profile Updated!"}
                </h3>
                <p className="text-green-200 text-sm mb-3">{saveMessage}</p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 bg-green-900/50 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${((3 - redirectCountdown) / 3) * 100}%` }} />
                  </div>
                  <span className="text-green-300 text-xs font-mono shrink-0">{redirectCountdown}s</span>
                </div>
                <p className="text-green-400 text-xs mb-3">
                  Redirecting in {redirectCountdown} second{redirectCountdown !== 1 ? "s" : ""}...
                </p>
                <button onClick={() => router.push("/dashboard")}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Go to Dashboard Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {saveStatus === "error" && (
          <div className="mb-6 rounded-2xl bg-red-900/40 border-2 border-red-500/60 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-red-300 mb-1">Could not save profile</h3>
                <p className="text-red-200 text-sm">{saveMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Unit mismatch warning */}
        {profile.startWeight > 0 && profile.currentWeight > 0 && isEditing && (
          profile.preferredUnit === "metric" && profile.currentWeight > 300
            ? <div className="mb-4 bg-amber-900/30 border border-amber-600/40 rounded-xl p-3 text-xs text-amber-300">
                ⚠️ Your weight looks very high for kg — did you mean {Math.round(profile.currentWeight * 0.453592)} kg?
              </div>
            : profile.preferredUnit === "imperial" && profile.currentWeight < 50
            ? <div className="mb-4 bg-amber-900/30 border border-amber-600/40 rounded-xl p-3 text-xs text-amber-300">
                ⚠️ Your weight looks very low for lbs — did you mean {Math.round(profile.currentWeight * 2.20462)} lbs?
              </div>
            : null
        )}

        {/* Welcome banner */}
        {isNewUser && isEditing && saveStatus !== "success" && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-purple-500/30 p-5">
            <h2 className="text-xl font-bold text-gray-100 mb-1">Welcome, {user?.name}! 👋</h2>
            <p className="text-gray-300 text-sm">
              Complete your profile so your AI coach can personalise everything for you.
            </p>
          </div>
        )}

        {/* Progress bar */}
        {isEditing && saveStatus !== "success" && (
          <div className="mb-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-slate-300">Profile completion</span>
              <span className={`text-sm font-bold ${
                progress === 100 ? "text-green-400" : progress >= 50 ? "text-yellow-400" : "text-red-400"
              }`}>{progress}% — {completedCount}/{REQUIRED_FIELDS.length} required</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all duration-500 ${
                progress === 100 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-500"
              }`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">Fill all required (*) fields then click Save</p>
          </div>
        )}

        {/* Header + Save button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 bg-slate-800/70 p-5 rounded-2xl border border-slate-700">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
              {isNewUser ? "Set Up Your Profile" : `${user?.name}'s Profile`}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">{user?.email}</p>
          </div>
          {saveStatus !== "success" && (
            <button onClick={handleSave} disabled={saveStatus === "saving"}
              className={`shrink-0 px-7 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                isEditing
                  ? progress === 100
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              }`}>
              {saveStatus === "saving" ? "Saving..."
                : isEditing ? (progress === 100 ? "Save & Go to Dashboard →" : `Save (${progress}% done)`)
                : "Edit Profile"}
            </button>
          )}
        </div>

        {/* Section 1: Basic Info */}
        <Section icon="👤" title="Basic Information" sub="Your fundamental details for personalised coaching">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <InputField label="Full Name" field="name" placeholder="Your name" required
              value={profile.name} disabled={!isEditing}
              borderCls={getBorderCls("name", true)} showHint={getShowHint("name")}
              isValid={isFieldValid("name")} onChange={handleFieldChange} />
            <SelectField label="Gender" field="gender" required
              value={profile.gender} disabled={!isEditing}
              borderCls={getBorderCls("gender", true)} showHint={getShowHint("gender")}
              isValid={isFieldValid("gender")} onChange={handleFieldChange}
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
            <InputField label="Age" field="age" type="number" placeholder="25" required
              value={profile.age} disabled={!isEditing}
              borderCls={getBorderCls("age", true)} showHint={getShowHint("age")}
              isValid={isFieldValid("age")} onChange={handleFieldChange} />
          </div>
        </Section>

        {/* Section 2: Body Measurements */}
        <Section icon="📏" title="Body Measurements" sub="Track your physical metrics">
          <div className="mb-5">
            <SelectField label="Preferred Unit" field="preferredUnit"
              value={profile.preferredUnit} disabled={!isEditing}
              borderCls={getBorderCls("preferredUnit")} showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "metric",   label: "Metric (kg, cm)" },
                { value: "imperial", label: "Imperial (lbs, ft)" },
              ]} />
          </div>

          {profile.startWeight > 0 && !isNewUser && (
            <div className="mb-4 bg-slate-700/50 border border-slate-600 rounded-xl p-3 text-xs text-slate-400">
              📍 Your starting weight was <span className="text-slate-200 font-semibold">{profile.startWeight} {weightLabel}</span>.
              This is used to calculate your progress and is never changed automatically.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InputField label={`Height (${heightLabel})`} field="height"
              placeholder={profile.preferredUnit === "metric" ? "178" : "5'10"} required
              value={profile.height} disabled={!isEditing}
              borderCls={getBorderCls("height", true)} showHint={getShowHint("height")}
              isValid={isFieldValid("height")} onChange={handleFieldChange} />
            <InputField label={`Current Weight (${weightLabel})`} field="currentWeight"
              type="number" placeholder={profile.preferredUnit === "metric" ? "75" : "165"} required
              value={profile.currentWeight} disabled={!isEditing}
              borderCls={getBorderCls("currentWeight", true)} showHint={getShowHint("currentWeight")}
              isValid={isFieldValid("currentWeight")} onChange={handleFieldChange} />
            <InputField label={`Target Weight (${weightLabel})`} field="targetWeight"
              type="number" placeholder={profile.preferredUnit === "metric" ? "65" : "145"}
              value={profile.targetWeight} disabled={!isEditing}
              borderCls={getBorderCls("targetWeight")} showHint={false} isValid={true}
              onChange={handleFieldChange} />
            <InputField label="Body Fat % (optional)" field="bodyFat" type="number" placeholder="18"
              value={profile.bodyFat} disabled={!isEditing}
              borderCls={getBorderCls("bodyFat")} showHint={false} isValid={true}
              onChange={handleFieldChange} />
            <div className="flex items-end">
              <div className="bg-green-900/30 rounded-xl p-4 w-full border border-green-700/40 text-center">
                <p className="text-xs text-slate-400 mb-1">Calculated BMI</p>
                <p className="text-3xl font-bold text-green-400">
                  {calculatedBMI > 0 ? calculatedBMI : "--"}
                </p>
                {calculatedBMI > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {calculatedBMI < 18.5 ? "Underweight"
                      : calculatedBMI < 25 ? "Normal range"
                      : calculatedBMI < 30 ? "Overweight"
                      : "Obese"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Section 3: Goals */}
        <Section icon="🎯" title="Fitness Goals" sub="Set your targets and timeline">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SelectField label="Primary Goal" field="primaryGoal" required
              value={profile.primaryGoal} disabled={!isEditing}
              borderCls={getBorderCls("primaryGoal", true)} showHint={getShowHint("primaryGoal")}
              isValid={isFieldValid("primaryGoal")} onChange={handleFieldChange}
              options={[
                { value: "lose-weight",         label: "Lose Weight"                },
                { value: "build-muscle",        label: "Build Muscle"               },
                { value: "improve-endurance",   label: "Improve Endurance"          },
                { value: "stay-active",         label: "Stay Active / Maintain"     },
                { value: "improve-flexibility", label: "Improve Flexibility"        },
                { value: "better-sleep",        label: "Better Sleep"               },
                { value: "lower-body-strength", label: "Lower Body Strength"        },
                { value: "glute-strength",      label: "Glute Strength"             },
                { value: "hip-mobility",        label: "Hip Mobility"               },
                { value: "core-strength",       label: "Core Strength"              },
                { value: "cardio-health",       label: "Cardiovascular Health"      },
                { value: "stress-relief",       label: "Stress Relief"              },
              ]} />
            <InputField label="Target Date (optional)" field="targetDate" type="date"
              value={profile.targetDate} disabled={!isEditing}
              borderCls={getBorderCls("targetDate")} showHint={false} isValid={true}
              onChange={handleFieldChange} />
          </div>
        </Section>

        {/* Section 4: Activity */}
        <Section icon="🏃" title="Activity Level" sub="Your current level of physical activity">
          <SelectField label="Current Activity Level" field="activityLevel" required
            value={profile.activityLevel} disabled={!isEditing}
            borderCls={getBorderCls("activityLevel", true)} showHint={getShowHint("activityLevel")}
            isValid={isFieldValid("activityLevel")} onChange={handleFieldChange}
            options={[
              { value: "sedentary",         label: "Sedentary (little/no exercise)"    },
              { value: "lightly-active",    label: "Lightly Active (1-3 days/week)"    },
              { value: "moderately-active", label: "Moderately Active (3-5 days/week)" },
              { value: "very-active",       label: "Very Active (6-7 days/week)"       },
              { value: "athlete",           label: "Athlete (2x per day)"              },
            ]} />
        </Section>

        {/* Section 5: Nutrition */}
        <Section icon="🥗" title="Nutrition Preferences" sub="Customise your diet plans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <InputField label="Daily Calorie Goal" field="dailyCalorieGoal" type="number" placeholder="2000"
                value={profile.dailyCalorieGoal} disabled={!isEditing}
                borderCls={getBorderCls("dailyCalorieGoal")} showHint={false} isValid={true}
                onChange={handleFieldChange} />
              {calculatedCalories > 0 && (
                <p className="text-xs text-green-400 mt-1">Recommended: {calculatedCalories} cal/day</p>
              )}
            </div>
            <SelectField label="Dietary Type" field="dietaryType"
              value={profile.dietaryType} disabled={!isEditing}
              borderCls={getBorderCls("dietaryType")} showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "no-restriction", label: "No Restriction" },
                { value: "vegetarian",     label: "Vegetarian"     },
                { value: "vegan",          label: "Vegan"          },
                { value: "keto",           label: "Keto"           },
                { value: "gluten-free",    label: "Gluten-Free"    },
                { value: "paleo",          label: "Paleo"          },
              ]} />
            <div className="sm:col-span-2">
              <TextAreaField label="Food Allergies (optional)" field="foodAllergies"
                placeholder="e.g. peanuts, shellfish, dairy" rows={2}
                value={profile.foodAllergies} disabled={!isEditing} onChange={handleFieldChange} />
            </div>
            <InputField label="Meals Per Day" field="mealsPerDay" type="number" placeholder="3"
              value={profile.mealsPerDay} disabled={!isEditing}
              borderCls={getBorderCls("mealsPerDay")} showHint={false} isValid={true}
              onChange={handleFieldChange} />
          </div>
        </Section>

        {/* Section 6: Fitness Background */}
        <Section icon="🏋️" title="Fitness Background" sub="Your experience and preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SelectField label="Experience Level" field="experienceLevel" required
              value={profile.experienceLevel} disabled={!isEditing}
              borderCls={getBorderCls("experienceLevel", true)} showHint={getShowHint("experienceLevel")}
              isValid={isFieldValid("experienceLevel")} onChange={handleFieldChange}
              options={[
                { value: "beginner",     label: "Beginner"     },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced",     label: "Advanced"     },
              ]} />
            <SelectField label="Preferred Workout" field="preferredWorkoutType"
              value={profile.preferredWorkoutType} disabled={!isEditing}
              borderCls={getBorderCls("preferredWorkoutType")} showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "cardio",    label: "Cardio"           },
                { value: "strength",  label: "Strength Training" },
                { value: "yoga",      label: "Yoga"             },
                { value: "mixed",     label: "Mixed"            },
                { value: "sports",    label: "Sports"           },
              ]} />
            <SelectField label="Available Equipment" field="availableEquipment"
              value={profile.availableEquipment} disabled={!isEditing}
              borderCls={getBorderCls("availableEquipment")} showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "none",      label: "None (Bodyweight)" },
                { value: "dumbbells", label: "Dumbbells"         },
                { value: "home-gym",  label: "Home Gym"          },
                { value: "full-gym",  label: "Full Gym Access"   },
              ]} />
            <InputField label="Workout Days/Week" field="workoutDaysPerWeek" type="number" placeholder="3"
              value={profile.workoutDaysPerWeek} disabled={!isEditing}
              borderCls={getBorderCls("workoutDaysPerWeek")} showHint={false} isValid={true}
              onChange={handleFieldChange} />
            <SelectField label="Session Duration" field="workoutDuration"
              value={profile.workoutDuration} disabled={!isEditing}
              borderCls={getBorderCls("workoutDuration")} showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "30min", label: "30 minutes" },
                { value: "45min", label: "45 minutes" },
                { value: "60min", label: "1 hour"     },
                { value: "90min", label: "90 minutes" },
              ]} />
          </div>
        </Section>

        {/* Section 7: Health */}
        <Section icon="⚕️" title="Health Information" sub="For safer, smarter recommendations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <TextAreaField label="Injuries / Physical Limitations (optional)" field="injuries"
              placeholder="e.g. lower back pain, knee injury..." rows={3}
              value={profile.injuries} disabled={!isEditing} onChange={handleFieldChange} />
            <TextAreaField label="Medical Conditions (optional)" field="medicalConditions"
              placeholder="e.g. diabetes, hypertension..." rows={3}
              value={profile.medicalConditions} disabled={!isEditing} onChange={handleFieldChange} />
          </div>
          <p className="text-xs text-slate-400 mt-3 bg-slate-900/40 p-3 rounded-lg border border-slate-700">
            Your health information is private and only visible to you.
          </p>
        </Section>

        {/* Summary */}
        {(profile.name || profile.currentWeight > 0) && saveStatus !== "success" && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border-2 border-green-700/40 mb-6">
            <h2 className="text-base font-bold text-slate-100 mb-4 text-center">
              {user?.name}&apos;s Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Name",    value: profile.name || "--" },
                { label: "Age",     value: profile.age  || "--" },
                { label: "Weight",  value: profile.currentWeight ? `${profile.currentWeight} ${weightLabel}` : "--" },
                { label: "BMI",     value: calculatedBMI > 0 ? calculatedBMI : "--", color: "text-green-400" },
                { label: "Cal Goal",value: profile.dailyCalorieGoal || calculatedCalories || "--", color: "text-amber-400" },
              ].map((item) => (
                <div key={item.label} className="bg-slate-800/70 rounded-xl p-3 text-center border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">{item.label}</p>
                  <p className={`text-sm font-bold ${(item as any).color || "text-slate-100"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}