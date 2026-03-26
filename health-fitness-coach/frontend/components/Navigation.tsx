"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "AI Coach", href: "/ai-coach", icon: "💬" },
    { label: "Workouts", href: "/workouts", icon: "🏋️" },
    { label: "Nutrition", href: "/nutrition", icon: "🥗" },
    { label: "Progress", href: "/progress", icon: "📈" },
    { label: "Profile", href: "/profile", icon: "👤" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
    { label: "Help", href: "/help", icon: "❓" },
  ];

  return (
    <nav className="bg-gradient-to-r from-green-700 to-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-3xl">🏋️</span>
            <span>FitCoach AI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  pathname === item.href
                    ? "bg-white text-green-700 font-semibold"
                    : "text-white hover:bg-green-600"
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={logout}
                className="ml-2 px-3 py-2 rounded-lg text-white hover:bg-red-600/80 transition-colors flex items-center gap-1 text-sm"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 hover:bg-green-600 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <span className="text-2xl">{isOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-green-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded transition-colors ${
                  pathname === item.href
                    ? "bg-white text-green-700 font-semibold"
                    : "text-white hover:bg-green-600"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="block w-full text-left px-4 py-2 rounded text-white hover:bg-red-600/80 transition-colors mt-2"
              >
                🚪 Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
