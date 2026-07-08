/**
 * useUnit — Shared unit hook
 * ─────────────────────────────────────────────────────────
 * Reads preferredUnit from localStorage (set by Profile page).
 * Returns the unit label and a converter function.
 * Use this on ANY page that displays weight.
 *
 * Usage:
 *   const { unit, convert, label } = useUnit(userId)
 *   display: `${convert(78, 'kg')} ${unit}`
 */

import { useState, useEffect } from "react"

type UnitSystem = "imperial" | "metric"

interface UseUnitReturn {
  unit:    "lbs" | "kg"          // display label
  system:  UnitSystem            // "imperial" | "metric"
  convert: (value: number, fromUnit: "lbs" | "kg") => number
  label:   (value: number, fromUnit?: "lbs" | "kg") => string
}

function getPreferredUnit(userId?: string): UnitSystem {
  try {
    // Try scoped key first (matches progress page pattern)
    if (userId) {
      const scoped = localStorage.getItem(`user_${userId}_userProfile`)
      if (scoped) {
        const p = JSON.parse(scoped)
        if (p?.preferredUnit) return p.preferredUnit as UnitSystem
      }
    }
    // Fallback to global key
    const global = localStorage.getItem("userProfile")
    if (global) {
      const p = JSON.parse(global)
      if (p?.preferredUnit) return p.preferredUnit as UnitSystem
    }
  } catch {}
  return "imperial" // default
}

function convertWeight(
  value: number,
  fromUnit: "lbs" | "kg",
  toUnit: "lbs" | "kg"
): number {
  if (fromUnit === toUnit) return value
  if (fromUnit === "kg" && toUnit === "lbs")
    return parseFloat((value * 2.20462).toFixed(1))
  if (fromUnit === "lbs" && toUnit === "kg")
    return parseFloat((value / 2.20462).toFixed(1))
  return value
}

export function useUnit(userId?: string): UseUnitReturn {
  const [system, setSystem] = useState<UnitSystem>("imperial")

  useEffect(() => {
    // Initial load
    setSystem(getPreferredUnit(userId))

    // Listen for profile saves (storage event)
    const handle = (e: StorageEvent) => {
      if (e.key && e.key.includes("userProfile")) {
        setSystem(getPreferredUnit(userId))
      }
    }
    window.addEventListener("storage", handle)
    return () => window.removeEventListener("storage", handle)
  }, [userId])

  const unit: "lbs" | "kg" = system === "metric" ? "kg" : "lbs"

  const convert = (value: number, fromUnit: "lbs" | "kg"): number =>
    convertWeight(value, fromUnit, unit)

  const label = (value: number, fromUnit: "lbs" | "kg" = "lbs"): string =>
    `${convert(value, fromUnit)} ${unit}`

  return { unit, system, convert, label }
}