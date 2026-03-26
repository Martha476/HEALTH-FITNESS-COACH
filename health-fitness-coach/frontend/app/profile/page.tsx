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
  currentWeight: 0, targetWeight: 0, bodyFat: 0,
  preferredUnit: "imperial", primaryGoal: "", targetDate: "",
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

// ─── Shared input base class ───────────────────────────────────────────────────
// Defined at module level so it never changes between renders
const BASE_CLS =
  "w-full px-4 py-3 bg-slate-700 border-2 rounded-lg text-slate-100 " +
  "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 " +
  "disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed " +
  "disabled:border-slate-700 transition-colors duration-200";

// ═════════════════════════════════════════════════════════════════════════════
// FIX 1: Sub-components defined OUTSIDE ProfilePage so React never recreates
// them on re-render — this fixes the input losing focus on every keystroke
// ═════════════════════════════════════════════════════════════════════════════

interface FieldHintProps {
  show:    boolean;
  isValid: boolean;
}
function FieldHint({ show, isValid }: FieldHintProps) {
  if (!show) return null;
  return isValid
    ? <p className="text-green-400 text-xs mt-1">✓ Looks good!</p>
    : <p className="text-red-400 text-xs mt-1">⚠ Required field</p>;
}

interface InputFieldProps {
  label:       string;
  field:       keyof Profile;
  type?:       string;
  placeholder?: string;
  required?:   boolean;
  value:       any;
  disabled:    boolean;
  borderCls:   string;
  showHint:    boolean;
  isValid:     boolean;
  onChange:    (field: keyof Profile, value: any) => void;
}
function InputField({
  label, field, type = "text", placeholder = "", required = false,
  value, disabled, borderCls, showHint, isValid, onChange,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={type === "number" && value === 0 ? "" : value}
        onChange={(e) =>
          onChange(
            field,
            type === "number"
              ? e.target.value === "" ? 0 : parseFloat(e.target.value)
              : e.target.value
          )
        }
        disabled={disabled}
        placeholder={disabled ? "" : placeholder}
        className={`${BASE_CLS} ${borderCls}`}
      />
      <FieldHint show={showHint} isValid={isValid} />
    </div>
  );
}

interface SelectFieldProps {
  label:    string;
  field:    keyof Profile;
  options:  { value: string; label: string }[];
  required?: boolean;
  value:    any;
  disabled: boolean;
  borderCls:string;
  showHint: boolean;
  isValid:  boolean;
  onChange: (field: keyof Profile, value: any) => void;
}
function SelectField({
  label, field, options, required = false,
  value, disabled, borderCls, showHint, isValid, onChange,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled}
        className={`${BASE_CLS} ${borderCls}`}
      >
        <option value="" disabled>Select {label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FieldHint show={showHint} isValid={isValid} />
    </div>
  );
}

interface TextAreaFieldProps {
  label:       string;
  field:       keyof Profile;
  placeholder?: string;
  rows?:       number;
  value:       any;
  disabled:    boolean;
  onChange:    (field: keyof Profile, value: any) => void;
}
function TextAreaField({
  label, field, placeholder = "", rows = 3,
  value, disabled, onChange,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "" : placeholder}
        rows={rows}
        className={`${BASE_CLS} border-slate-600 resize-y`}
      />
    </div>
  );
}

interface SectionProps {
  icon:     string;
  title:    string;
  sub:      string;
  children: React.ReactNode;
}
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

// ═════════════════════════════════════════════════════════════════════════════
// Profile Page
// ═════════════════════════════════════════════════════════════════════════════
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

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  // Load profile
  useEffect(() => {
    if (!user) return;

    setProfile({ ...EMPTY_PROFILE, name: user.name || "" });
    setIsNewUser(true);
    setIsEditing(true);
    setDirtyFields(new Set());
    setSaveAttempted(false);
    setSaveStatus("idle");
    setSaveMessage("");

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile/${user.id}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 2) {
            setProfile({ ...EMPTY_PROFILE, name: user.name || "", ...data });
            setIsNewUser(false);
            setIsEditing(false);
            return;
          }
        }
      } catch {}

      const scoped = localStorage.getItem(getUserKey("userProfile"));
      if (scoped) {
        try {
          setProfile({ ...EMPTY_PROFILE, ...JSON.parse(scoped) });
          setIsNewUser(false);
          setIsEditing(false);
          return;
        } catch {}
      }

      setProfile({ ...EMPTY_PROFILE, name: user.name || "" });
      setIsNewUser(true);
      setIsEditing(true);
    };

    load();
  }, [user?.id]);

  // BMI + calorie calculations
  useEffect(() => {
    if (profile.currentWeight > 0 && profile.height) {
      const h = parseFloat(profile.height.replace(/['"a-z]/gi, "")) || 0;
      if (h > 0) {
        setCalculatedBMI(
          Math.round(((profile.currentWeight / (h * h)) * 703) * 10) / 10
        );
      }
    }
    if (profile.age > 0 && profile.currentWeight > 0 && profile.activityLevel) {
      const m: Record<string, number> = {
        sedentary: 1.2, "lightly-active": 1.375,
        "moderately-active": 1.55, "very-active": 1.725, athlete: 1.9,
      };
      let bmr = 10 * (profile.currentWeight * 0.453592) + 6.25 * 170 - 5 * profile.age;
      if (profile.gender === "male")   bmr += 5;
      if (profile.gender === "female") bmr -= 161;
      let cal = bmr * (m[profile.activityLevel] || 1.2);
      if (profile.primaryGoal === "lose-weight")  cal -= 500;
      if (profile.primaryGoal === "build-muscle") cal += 300;
      setCalculatedCalories(Math.round(cal));
    }
  }, [profile]);

  // Redirect countdown
  useEffect(() => {
    if (redirectCountdown <= 0) return;
    if (redirectCountdown === 1) {
      router.push("/dashboard");
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  // Validation helpers
  const isFieldValid = useCallback((field: keyof Profile) => {
    if (!REQUIRED_FIELDS.includes(field)) return true;
    const v = profile[field];
    return typeof v === "number" ? v > 0 : !!v;
  }, [profile]);

  const getBorderCls = useCallback((field: keyof Profile, required = false) => {
    if (!isEditing)  return "border-slate-700";
    if (!required)   return "border-slate-600";
    const show = saveAttempted || dirtyFields.has(field);
    if (!show)       return "border-slate-600";
    return isFieldValid(field) ? "border-green-500" : "border-red-500";
  }, [isEditing, saveAttempted, dirtyFields, isFieldValid]);

  const getShowHint = useCallback((field: keyof Profile) => {
    return saveAttempted || dirtyFields.has(field);
  }, [saveAttempted, dirtyFields]);

  // onChange — stable reference so inputs never remount
  const handleFieldChange = useCallback((field: keyof Profile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setDirtyFields((prev) => new Set([...prev, field]));
  }, []);

  // ── handleSave ────────────────────────────────────────────────────────────
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
      setSaveMessage(
        `Please fill in: ${missing
          .map((f) => f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()))
          .join(", ")}`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("Saving your profile...");

    const toSave =
      profile.dailyCalorieGoal === 0 && calculatedCalories > 0
        ? { ...profile, dailyCalorieGoal: calculatedCalories }
        : profile;

    setProfile(toSave);

    if (!user) {
      setSaveStatus("error");
      setSaveMessage("❌ Not logged in. Please log in again.");
      return;
    }

    // ── FIX 2: Save to localStorage FIRST with the exact keys AppShell reads
    // AppShell checks localStorage("userProfile") for profileComplete
    // We must save BEFORE redirecting so AppShell sees the complete profile
    localStorage.setItem(getUserKey("userProfile"), JSON.stringify(toSave));
    localStorage.setItem("userProfile", JSON.stringify(toSave));

    // Also mark profile as complete in a dedicated key so AppShell can check it
    localStorage.setItem("profileComplete", "true");

    // Backend sync (non-blocking)
    let backendSaved = false;
    try {
      const res = await fetch(`${API_URL}/api/profile/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(toSave),
      });
      backendSaved = res.ok;
    } catch {
      backendSaved = false;
    }

    setIsEditing(false);
    setIsNewUser(false);
    setSaveStatus("success");
    setSaveMessage(
      backendSaved
        ? isNewUser
          ? "🎉 Profile created! Redirecting to your dashboard..."
          : "✅ Profile updated! Redirecting to your dashboard..."
        : "✅ Profile saved! Redirecting to your dashboard..."
    );

    // Start 3s countdown then redirect
    setRedirectCountdown(3);
  };

  const completedCount = REQUIRED_FIELDS.filter(isFieldValid).length;
  const progress       = Math.round((completedCount / REQUIRED_FIELDS.length) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-4xl mx-auto">

        {/* ── Success banner ───────────────────────────────────────────────── */}
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
                    <div
                      className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${((3 - redirectCountdown) / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-green-300 text-xs font-mono shrink-0">
                    {redirectCountdown}s
                  </span>
                </div>
                <p className="text-green-400 text-xs mb-3">
                  Redirecting in {redirectCountdown} second{redirectCountdown !== 1 ? "s" : ""}...
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Go to Dashboard Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {saveStatus === "error" && (
          <div className="mb-6 rounded-2xl bg-red-900/40 border-2 border-red-500/60 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-red-300 mb-1">
                  Could not save profile
                </h3>
                <p className="text-red-200 text-sm">{saveMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Welcome banner (new users only) ──────────────────────────────── */}
        {isNewUser && isEditing && saveStatus !== "success" && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-purple-500/30 p-5">
            <h2 className="text-xl font-bold text-gray-100 mb-1">
              Welcome, {user?.name}! 👋
            </h2>
            <p className="text-gray-300 text-sm">
              Complete your profile so your AI coach can personalise everything
              for you. You'll be taken to your dashboard when done.
            </p>
          </div>
        )}

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        {isEditing && saveStatus !== "success" && (
          <div className="mb-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-slate-300">
                Profile completion
              </span>
              <span className={`text-sm font-bold ${
                progress === 100 ? "text-green-400"
                : progress >= 50  ? "text-yellow-400"
                : "text-red-400"
              }`}>
                {progress}% — {completedCount}/{REQUIRED_FIELDS.length} required
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  progress === 100 ? "bg-green-500"
                  : progress >= 50  ? "bg-yellow-500"
                  : "bg-red-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fill all required (*) fields then click Save
            </p>
          </div>
        )}

        {/* ── Header + Save/Edit button ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 bg-slate-800/70 p-5 rounded-2xl border border-slate-700">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
              {isNewUser ? "Set Up Your Profile" : `${user?.name}'s Profile`}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">{user?.email}</p>
          </div>

          {saveStatus !== "success" && (
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`shrink-0 px-7 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                isEditing
                  ? progress === 100
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              }`}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : isEditing
                ? progress === 100 ? "Save & Go to Dashboard →" : `Save (${progress}% done)`
                : "Edit Profile"}
            </button>
          )}
        </div>

        {/* ── Section 1: Basic Info ─────────────────────────────────────────── */}
        <Section icon="👤" title="Basic Information" sub="Your fundamental details for personalised coaching">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <InputField
              label="Full Name" field="name" placeholder="Your name" required
              value={profile.name} disabled={!isEditing}
              borderCls={getBorderCls("name", true)}
              showHint={getShowHint("name")} isValid={isFieldValid("name")}
              onChange={handleFieldChange}
            />
            <SelectField
              label="Gender" field="gender" required
              value={profile.gender} disabled={!isEditing}
              borderCls={getBorderCls("gender", true)}
              showHint={getShowHint("gender")} isValid={isFieldValid("gender")}
              onChange={handleFieldChange}
              options={[
                { value: "male",   label: "Male"   },
                { value: "female", label: "Female" },
                { value: "other",  label: "Other"  },
              ]}
            />
            <InputField
              label="Age" field="age" type="number" placeholder="25" required
              value={profile.age} disabled={!isEditing}
              borderCls={getBorderCls("age", true)}
              showHint={getShowHint("age")} isValid={isFieldValid("age")}
              onChange={handleFieldChange}
            />
          </div>
        </Section>

        {/* ── Section 2: Body Measurements ─────────────────────────────────── */}
        <Section icon="📏" title="Body Measurements" sub="Track your physical metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SelectField
              label="Preferred Unit" field="preferredUnit"
              value={profile.preferredUnit} disabled={!isEditing}
              borderCls={getBorderCls("preferredUnit")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "imperial", label: "Imperial (lbs, ft)" },
                { value: "metric",   label: "Metric (kg, cm)"    },
              ]}
            />
            <InputField
              label={profile.preferredUnit === "metric" ? "Height (cm)" : "Height (ft/in)"}
              field="height" placeholder="5'10 or 178" required
              value={profile.height} disabled={!isEditing}
              borderCls={getBorderCls("height", true)}
              showHint={getShowHint("height")} isValid={isFieldValid("height")}
              onChange={handleFieldChange}
            />
            <InputField
              label={profile.preferredUnit === "metric" ? "Current Weight (kg)" : "Current Weight (lbs)"}
              field="currentWeight" type="number" placeholder="150" required
              value={profile.currentWeight} disabled={!isEditing}
              borderCls={getBorderCls("currentWeight", true)}
              showHint={getShowHint("currentWeight")} isValid={isFieldValid("currentWeight")}
              onChange={handleFieldChange}
            />
            <InputField
              label={profile.preferredUnit === "metric" ? "Target Weight (kg)" : "Target Weight (lbs)"}
              field="targetWeight" type="number" placeholder="140"
              value={profile.targetWeight} disabled={!isEditing}
              borderCls={getBorderCls("targetWeight")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
            />
            <InputField
              label="Body Fat % (optional)" field="bodyFat" type="number" placeholder="18"
              value={profile.bodyFat} disabled={!isEditing}
              borderCls={getBorderCls("bodyFat")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
            />
            <div className="flex items-end">
              <div className="bg-green-900/30 rounded-xl p-4 w-full border border-green-700/40 text-center">
                <p className="text-xs text-slate-400 mb-1">Calculated BMI</p>
                <p className="text-3xl font-bold text-green-400">
                  {calculatedBMI > 0 ? calculatedBMI : "--"}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 3: Goals ─────────────────────────────────────────────── */}
        <Section icon="🎯" title="Fitness Goals" sub="Set your targets and timeline">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SelectField
              label="Primary Goal" field="primaryGoal" required
              value={profile.primaryGoal} disabled={!isEditing}
              borderCls={getBorderCls("primaryGoal", true)}
              showHint={getShowHint("primaryGoal")} isValid={isFieldValid("primaryGoal")}
              onChange={handleFieldChange}
              options={[
                { value: "lose-weight",         label: "Lose Weight"           },
                { value: "build-muscle",        label: "Build Muscle"          },
                { value: "improve-endurance",   label: "Improve Endurance"     },
                { value: "stay-active",         label: "Stay Active / Maintain"},
                { value: "improve-flexibility", label: "Improve Flexibility"   },
              ]}
            />
            <InputField
              label="Target Date (optional)" field="targetDate" type="date"
              value={profile.targetDate} disabled={!isEditing}
              borderCls={getBorderCls("targetDate")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
            />
          </div>
        </Section>

        {/* ── Section 4: Activity ──────────────────────────────────────────── */}
        <Section icon="🏃" title="Activity Level" sub="Your current level of physical activity">
          <SelectField
            label="Current Activity Level" field="activityLevel" required
            value={profile.activityLevel} disabled={!isEditing}
            borderCls={getBorderCls("activityLevel", true)}
            showHint={getShowHint("activityLevel")} isValid={isFieldValid("activityLevel")}
            onChange={handleFieldChange}
            options={[
              { value: "sedentary",         label: "Sedentary (little/no exercise)"    },
              { value: "lightly-active",    label: "Lightly Active (1-3 days/week)"    },
              { value: "moderately-active", label: "Moderately Active (3-5 days/week)" },
              { value: "very-active",       label: "Very Active (6-7 days/week)"       },
              { value: "athlete",           label: "Athlete (2x per day)"              },
            ]}
          />
        </Section>

        {/* ── Section 5: Nutrition ─────────────────────────────────────────── */}
        <Section icon="🥗" title="Nutrition Preferences" sub="Customise your diet plans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <InputField
                label="Daily Calorie Goal" field="dailyCalorieGoal" type="number" placeholder="2000"
                value={profile.dailyCalorieGoal} disabled={!isEditing}
                borderCls={getBorderCls("dailyCalorieGoal")}
                showHint={false} isValid={true}
                onChange={handleFieldChange}
              />
              {calculatedCalories > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  Recommended: {calculatedCalories} cal/day
                </p>
              )}
            </div>
            <SelectField
              label="Dietary Type" field="dietaryType"
              value={profile.dietaryType} disabled={!isEditing}
              borderCls={getBorderCls("dietaryType")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "no-restriction", label: "No Restriction" },
                { value: "vegetarian",     label: "Vegetarian"     },
                { value: "vegan",          label: "Vegan"          },
                { value: "keto",           label: "Keto"           },
                { value: "gluten-free",    label: "Gluten-Free"    },
                { value: "paleo",          label: "Paleo"          },
              ]}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Food Allergies (optional)" field="foodAllergies"
                placeholder="e.g. peanuts, shellfish, dairy" rows={2}
                value={profile.foodAllergies} disabled={!isEditing}
                onChange={handleFieldChange}
              />
            </div>
            <InputField
              label="Meals Per Day" field="mealsPerDay" type="number" placeholder="3"
              value={profile.mealsPerDay} disabled={!isEditing}
              borderCls={getBorderCls("mealsPerDay")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
            />
          </div>
        </Section>

        {/* ── Section 6: Fitness Background ────────────────────────────────── */}
        <Section icon="🏋️" title="Fitness Background" sub="Your experience and preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SelectField
              label="Experience Level" field="experienceLevel" required
              value={profile.experienceLevel} disabled={!isEditing}
              borderCls={getBorderCls("experienceLevel", true)}
              showHint={getShowHint("experienceLevel")} isValid={isFieldValid("experienceLevel")}
              onChange={handleFieldChange}
              options={[
                { value: "beginner",     label: "Beginner"     },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced",     label: "Advanced"     },
              ]}
            />
            <SelectField
              label="Preferred Workout" field="preferredWorkoutType"
              value={profile.preferredWorkoutType} disabled={!isEditing}
              borderCls={getBorderCls("preferredWorkoutType")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "cardio",    label: "Cardio"            },
                { value: "strength",  label: "Strength Training"  },
                { value: "yoga",      label: "Yoga"              },
                { value: "mixed",     label: "Mixed"             },
                { value: "sports",    label: "Sports"            },
              ]}
            />
            <SelectField
              label="Available Equipment" field="availableEquipment"
              value={profile.availableEquipment} disabled={!isEditing}
              borderCls={getBorderCls("availableEquipment")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "none",      label: "None (Bodyweight)" },
                { value: "dumbbells", label: "Dumbbells"         },
                { value: "home-gym",  label: "Home Gym"          },
                { value: "full-gym",  label: "Full Gym Access"   },
              ]}
            />
            <InputField
              label="Workout Days/Week" field="workoutDaysPerWeek" type="number" placeholder="3"
              value={profile.workoutDaysPerWeek} disabled={!isEditing}
              borderCls={getBorderCls("workoutDaysPerWeek")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
            />
            <SelectField
              label="Session Duration" field="workoutDuration"
              value={profile.workoutDuration} disabled={!isEditing}
              borderCls={getBorderCls("workoutDuration")}
              showHint={false} isValid={true}
              onChange={handleFieldChange}
              options={[
                { value: "30min", label: "30 minutes" },
                { value: "45min", label: "45 minutes" },
                { value: "60min", label: "1 hour"     },
                { value: "90min", label: "90 minutes" },
              ]}
            />
          </div>
        </Section>

        {/* ── Section 7: Health ────────────────────────────────────────────── */}
        <Section icon="⚕️" title="Health Information" sub="For safer, smarter recommendations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <TextAreaField
              label="Injuries / Physical Limitations (optional)" field="injuries"
              placeholder="e.g. lower back pain, knee injury..." rows={3}
              value={profile.injuries} disabled={!isEditing}
              onChange={handleFieldChange}
            />
            <TextAreaField
              label="Medical Conditions (optional)" field="medicalConditions"
              placeholder="e.g. diabetes, hypertension..." rows={3}
              value={profile.medicalConditions} disabled={!isEditing}
              onChange={handleFieldChange}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 bg-slate-900/40 p-3 rounded-lg border border-slate-700">
            Your health information is private and only visible to you.
          </p>
        </Section>

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        {(profile.name || profile.currentWeight > 0) && saveStatus !== "success" && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border-2 border-green-700/40 mb-6">
            <h2 className="text-base font-bold text-slate-100 mb-4 text-center">
              {user?.name}&apos;s Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Name",     value: profile.name || "--"                                                                                        },
                { label: "Age",      value: profile.age  || "--"                                                                                        },
                { label: "Weight",   value: profile.currentWeight ? `${profile.currentWeight} ${profile.preferredUnit === "metric" ? "kg" : "lbs"}` : "--" },
                { label: "BMI",      value: calculatedBMI > 0 ? calculatedBMI : "--",                           color: "text-green-400"                 },
                { label: "Cal Goal", value: profile.dailyCalorieGoal || calculatedCalories || "--",              color: "text-amber-400"                 },
              ].map((item) => (
                <div key={item.label} className="bg-slate-800/70 rounded-xl p-3 text-center border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">{item.label}</p>
                  <p className={`text-sm font-bold ${(item as any).color || "text-slate-100"}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}