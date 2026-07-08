"use client";

/**
 * useUserData — Central hook for user-isolated data access.
 *
 * Use this in every page that needs:
 *   - Current user's profile
 *   - User-scoped localStorage (no cross-user contamination)
 *   - Auth headers for API calls
 *   - AI Coach profile payload
 *
 * Usage:
 *   const { profile, userName, saveProfile, get, set, headers, buildAIProfile } = useUserData()
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserProfile {
  id?: string;
  name?: string;
  age?: number;
  gender?: string;
  height?: string;
  currentWeight?: number;
  targetWeight?: number;
  primaryGoal?: string;
  activityLevel?: string;
  experienceLevel?: string;
  dietaryType?: string;
  foodAllergies?: string;
  dailyCalorieGoal?: number;
  mealsPerDay?: number;
  preferredWorkoutType?: string;
  availableEquipment?: string;
  workoutDaysPerWeek?: number;
  workoutDuration?: string;
  injuries?: string;
  medicalConditions?: string;
  bodyFat?: number;
  preferredUnit?: string;
  targetDate?: string;
}

export function useUserData() {
  const { user, getAuthHeaders, getUserKey } = useAuth();
  const [profile, setProfileState] = useState<UserProfile>({});
  const [profileLoaded, setProfileLoaded] = useState(false);

  // ── Reload whenever logged-in user changes ───────────────────────
  useEffect(() => {
    setProfileLoaded(false);
    setProfileState({});
    if (!user) return;
    loadProfile();
  }, [user?.id]); // Re-runs when user switches — KEY for isolation

  // ── Load profile for current user only ──────────────────────────
  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Try backend
      try {
        const res = await fetch(
          `${API_URL}/api/profile/${user.id}`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            const merged = { ...user, ...data };
            setProfileState(merged);
            // Cache in user-scoped key
            localStorage.setItem(getUserKey("userProfile"), JSON.stringify(merged));
            localStorage.setItem("userProfile", JSON.stringify(merged));
            setProfileLoaded(true);
            return;
          }
        }
      } catch {}

      // 2. Try user-scoped localStorage: user_<id>_userProfile
      const scoped = localStorage.getItem(getUserKey("userProfile"));
      if (scoped) {
        const parsed = JSON.parse(scoped);
        setProfileState({ ...user, ...parsed });
        localStorage.setItem("userProfile", scoped);
        setProfileLoaded(true);
        return;
      }

      // 3. New user — only auth data
      setProfileState({ id: user.id, name: user.name });
      setProfileLoaded(true);
    } catch {
      setProfileState({ id: user.id, name: user.name });
      setProfileLoaded(true);
    }
  }, [user, getAuthHeaders, getUserKey]);

  // ── Save profile for current user ───────────────────────────────
  const saveProfile = useCallback(async (data: UserProfile) => {
    if (!user) return;
    const updated = { ...profile, ...data };
    setProfileState(updated);

    // Save to user-scoped key — prevents cross-user contamination
    localStorage.setItem(getUserKey("userProfile"), JSON.stringify(updated));
    localStorage.setItem("userProfile", JSON.stringify(updated));

    // Sync to backend
    try {
      await fetch(`${API_URL}/api/profile/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updated),
      });
    } catch {}
  }, [profile, user, getAuthHeaders, getUserKey]);

  // ── User-scoped get — reads user_<id>_<key> ─────────────────────
  const get = useCallback(<T>(key: string, fallback: T): T => {
    if (!user) return fallback;
    try {
      const val = localStorage.getItem(getUserKey(key));
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }, [user, getUserKey]);

  // ── User-scoped set — writes user_<id>_<key> ────────────────────
  const set = useCallback(<T>(key: string, value: T) => {
    if (!user) return;
    localStorage.setItem(getUserKey(key), JSON.stringify(value));
    // Also write to shared key for backward compat
    localStorage.setItem(key, JSON.stringify(value));
  }, [user, getUserKey]);

  // ── User-scoped remove ───────────────────────────────────────────
  const remove = useCallback((key: string) => {
    if (!user) return;
    localStorage.removeItem(getUserKey(key));
    localStorage.removeItem(key);
  }, [user, getUserKey]);

  // ── Build AI Coach profile payload ───────────────────────────────
  // Use this in ai-coach/page.tsx instead of building it manually
  const buildAIProfile = useCallback(() => ({
    id:                    user?.id || "default",
    name:                  profile.name  || user?.name  || "User",
    age:                   profile.age   || 30,
    gender:                profile.gender || "other",
    weight_lbs:            profile.currentWeight || 150,
    height:                profile.height || "5'10",
    target_weight:         profile.targetWeight || 0,
    fitness_level:         profile.experienceLevel || "intermediate",
    primary_goal:          profile.primaryGoal || "general fitness",
    activity_level:        profile.activityLevel || "moderate",
    dietary_type:          profile.dietaryType || "no-restriction",
    food_allergies:        profile.foodAllergies || "",
    meals_per_day:         profile.mealsPerDay || 3,
    daily_calorie_goal:    profile.dailyCalorieGoal || 0,
    preferred_workout:     profile.preferredWorkoutType || "mixed",
    equipment_available:   profile.availableEquipment || "none",
    workout_days_per_week: profile.workoutDaysPerWeek || 3,
    workout_duration:      profile.workoutDuration || "45min",
    injuries:              profile.injuries || "",
    medical_conditions:    profile.medicalConditions || "",
  }), [profile, user]);

  return {
    // Current user info
    user,
    userId:    user?.id    || "",
    userName:  user?.name  || "",
    userEmail: user?.email || "",

    // Profile data
    profile,
    profileLoaded,
    loadProfile,
    saveProfile,

    // Isolated storage — safe from cross-user contamination
    // Use these instead of localStorage.getItem/setItem directly
    get,
    set,
    remove,

    // API helpers
    headers: getAuthHeaders(),
    buildAIProfile,
  };
}