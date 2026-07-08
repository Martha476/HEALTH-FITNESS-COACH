"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faRobot,
  faDumbbell,
  faUtensils,
  faChartBar,
  faUser,
  faCog,
  faQuestionCircle,
  faSignOutAlt,
  faBars,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const NAV_ITEMS = [
  { href: "/dashboard", icon: faHome, label: "Dashboard" },
  { href: "/ai-coach", icon: faRobot, label: "AI Coach" },
  { href: "/workouts", icon: faDumbbell, label: "Workouts" },
  { href: "/nutrition", icon: faUtensils, label: "Nutrition" },
  { href: "/progress", icon: faChartBar, label: "Progress" },
];

const SECONDARY_ITEMS = [
  { href: "/profile", icon: faUser, label: "Profile" },
  { href: "/settings", icon: faCog, label: "Settings" },
  { href: "/help", icon: faQuestionCircle, label: "Help" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  // Hide navbar on auth pages
  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/verify-email") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/forget-password")
  ) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-lg shrink-0 group-hover:shadow-lg group-hover:shadow-teal-500/25 transition-all">
              💪
            </div>
            <span className="hidden sm:inline text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              FitCoach AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-3">
            {/* Secondary Items */}
            <div className="hidden xl:flex items-center gap-1">
              {SECONDARY_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 ${
                      active
                        ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                  </Link>
                );
              })}
            </div>

            {/* User Profile Dropdown */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-700/60">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-100">{user?.name || "User"}</p>
                <p className="text-xs text-slate-500">{user?.email || ""}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            aria-label="Toggle menu"
          >
            <FontAwesomeIcon
              icon={mobileMenuOpen ? faTimes : faBars}
              className="w-5 h-5"
            />
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-700/60 bg-slate-800/50 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-slate-700/60 my-2 pt-2">
                {SECONDARY_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                      }`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 border-t border-slate-700/60 mt-2 pt-2"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
