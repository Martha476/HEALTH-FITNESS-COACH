"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  clearAuthSession,
  getStoredToken,
  persistAuthSession,
  redirectAfterLogin,
  startGoogleSignIn,
  syncAuthSession,
  validateSession,
} from "../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: string;
  email: string;
  name?: string;
  email_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ requiresVerification?: boolean }>;
  loginWithGoogle: () => void;
  getAuthHeaders: () => { Authorization: string };
  getUserKey: (key: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const token = getStoredToken();
      const savedUser = localStorage.getItem("user");

      if (!token) {
        clearAuthSession();
        setUser(null);
        setIsLoading(false);
        return;
      }

      let parsedUser: User | null = null;
      if (savedUser) {
        try {
          parsedUser = JSON.parse(savedUser);
        } catch {
          parsedUser = null;
        }
      }

      const verified = await validateSession(token);
      if (!verified) {
        clearAuthSession();
        setUser(null);
        setIsLoading(false);
        return;
      }

      syncAuthSession(token, verified);
      setUser(verified);
      setIsLoading(false);
    };

    loadSession();
    window.addEventListener("fitcoach-auth", loadSession);
    return () => window.removeEventListener("fitcoach-auth", loadSession);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    const token = data.token ?? data.access_token;
    await redirectAfterLogin(token, data.user);
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    window.location.href = "/";
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    const data = await response.json();
    if (data.token && data.user) {
      await redirectAfterLogin(data.token, data.user);
      return {};
    }
    return { requiresVerification: true };
  };

  const loginWithGoogle = () => {
    startGoogleSignIn();
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return { Authorization: `Bearer ${token}` };
  };

  const getUserKey = (key: string) => {
    if (!user) return key;
    return `user_${user.id}_${key}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        loginWithGoogle,
        getAuthHeaders,
        getUserKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
