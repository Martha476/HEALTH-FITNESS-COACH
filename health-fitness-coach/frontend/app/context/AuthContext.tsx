"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  getAuthHeaders: () => Record<string, string>;
  getUserKey: (key: string) => string;
}

export const TOKEN_KEY = "fitcoach_token";
export const USER_KEY  = "fitcoach_user";

const USER_SCOPED_KEYS = [
  "userProfile",
  "aiCoachSettings",
  "workoutHistory",
  "mealHistory",
  "progressData",
  "chatHistory",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Cookie helpers (needed so Next.js middleware can read the token) ──
const setCookie = (name: string, value: string, days = 7) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser  = localStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id && parsed?.email && typeof parsed === "object" && !Array.isArray(parsed)) {
          setToken(savedToken);
          setUser(parsed);
          // Re-set cookie in case it expired
          setCookie(TOKEN_KEY, savedToken);
          restoreUserData(parsed.id);
        } else {
          clearAllStorage();
        }
      }
    } catch {
      clearAllStorage();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    USER_SCOPED_KEYS.forEach((k) => localStorage.removeItem(k));
    deleteCookie(TOKEN_KEY);
  };

  const migrateToUserScope = (userId: string) => {
    USER_SCOPED_KEYS.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) localStorage.setItem(`user_${userId}_${key}`, val);
    });
  };

  const restoreUserData = (userId: string) => {
    USER_SCOPED_KEYS.forEach((key) => {
      const scoped = localStorage.getItem(`user_${userId}_${key}`);
      if (scoped) {
        localStorage.setItem(key, scoped);
      } else {
        localStorage.removeItem(key);
      }
    });
  };

  const persistAuth = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify({
      id:     newUser.id,
      name:   newUser.name,
      email:  newUser.email,
      avatar: newUser.avatar ?? "",
    }));
    // KEY FIX: Set cookie so middleware can protect routes
    setCookie(TOKEN_KEY, newToken);
    restoreUserData(newUser.id);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed.");
    }
    const data = await res.json();
    if (!data.token || !data.user) throw new Error("Invalid server response.");

    // Save previous user's data before switching
    const prevUser = localStorage.getItem(USER_KEY);
    if (prevUser) {
      const prev = JSON.parse(prevUser);
      if (prev.id && prev.id !== data.user.id) {
        migrateToUserScope(prev.id);
        USER_SCOPED_KEYS.forEach((k) => localStorage.removeItem(k));
      }
    }

    persistAuth(data.token, data.user);
  }, [persistAuth]);

  const register = useCallback(async (
    name: string, email: string, password: string,
  ) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed.");
    }
    const data = await res.json();
    if (!data.token || !data.user) throw new Error("Invalid server response.");

    USER_SCOPED_KEYS.forEach((k) => localStorage.removeItem(k));
    persistAuth(data.token, data.user);
  }, [persistAuth]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    if (user?.id) migrateToUserScope(user.id);
    clearAllStorage();
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, [token, user]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  const getUserKey = useCallback((key: string): string => {
    return user ? `user_${user.id}_${key}` : key;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, token, login, register, logout, isLoading,
      getAuthHeaders, getUserKey,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}