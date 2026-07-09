"use client";
/**
 * useTranslation.ts
 * Place at: frontend/hooks/useTranslation.ts
 *
 * Usage in any page:
 *   import { useTranslation } from "@/hooks/useTranslation";
 *   const { t } = useTranslation();
 *   return <h1>{t("nav.dashboard")}</h1>
 */

import { useState, useEffect, useCallback } from "react";

// ─── Supported languages ──────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ar: "العربية",
  ru: "Русский",
  pt: "Português",
  ja: "日本語",
  hi: "हिन्दी",
};

// ─── Cache translations in memory ────────────────────────────────────────────
const cache: Record<string, Record<string, any>> = {};

// ─── Fetch translations from /messages/ folder ───────────────────────────────
async function fetchTranslations(lang: string): Promise<Record<string, any>> {
  if (cache[lang]) return cache[lang];
  try {
    const res = await fetch(`/messages/${lang}.json`);
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();
    cache[lang] = data;
    return data;
  } catch {
    if (lang !== "en") return fetchTranslations("en");
    return {};
  }
}

// ─── Resolve a dot-notation key: "nav.dashboard" ─────────────────────────────
function resolve(obj: Record<string, any>, key: string): string {
  const parts = key.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

// ─── Get saved language from localStorage ────────────────────────────────────
function getSavedLang(): string {
  if (typeof window === "undefined") return "en";
  try {
    const s = localStorage.getItem("aiCoachSettings");
    if (s) return JSON.parse(s).language || "en";
  } catch {}
  return "en";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTranslation() {
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [lang,         setLang]         = useState<string>("en");
  const [isLoading,    setIsLoading]    = useState<boolean>(true);

  const load = useCallback(async (l: string) => {
    setIsLoading(true);
    const data = await fetchTranslations(l);
    setTranslations(data);
    setLang(l);
    // Set html dir for RTL languages
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
    setIsLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    load(getSavedLang());
  }, [load]);

  // Re-load when settings change
  useEffect(() => {
    const handle = (e: StorageEvent) => {
      if (e.key === "aiCoachSettings" && e.newValue) {
        try {
          const newLang = JSON.parse(e.newValue).language || "en";
          if (newLang !== lang) load(newLang);
        } catch {}
      }
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [lang, load]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const result = resolve(translations, key);
      if (result === key && fallback) return fallback;
      return result;
    },
    [translations]
  );

  return { t, lang, isLoading };
}