"use client";

import { useState } from "react";
import { useAuth } from "./context/AuthContext";  // ← Fixed path (../ not ./)
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
  faArrowLeft,
  faArrowRight,
  faBars,
} from "@fortawesome/free-solid-svg-icons";

const NAV_ITEMS = [
  { href: "/dashboard", icon: faHome, label: "Dashboard" },
  { href: "/ai-coach", icon: faRobot, label: "AI Coach" },
  { href: "/workouts", icon: faDumbbell, label: "Workouts" },
  { href: "/nutrition", icon: faUtensils, label: "Nutrition" },
  { href: "/progress", icon: faChartBar, label: "Progress" },
  { href: "/profile", icon: faUser, label: "Profile" },
  { href: "/settings", icon: faCog, label: "Settings" },
  { href: "/help", icon: faQuestionCircle, label: "Help" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 flex flex-col h-full bg-slate-900 border-r border-slate-700/60 transition-all duration-300 ease-in-out shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/60 ${sidebarCollapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-xl shrink-0">
            💪
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">FitCoach AI</p>
              <p className="text-xs text-slate-500 truncate">Your AI fitness companion</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                  active
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
                  sidebarCollapsed ? "justify-center" : "",
                ].join(" ")}
              >
                <span className="text-base leading-none shrink-0 w-5 flex justify-center">
                  <FontAwesomeIcon icon={item.icon} />
                </span>
                {!sidebarCollapsed && <span className="truncate flex-1">{item.label}</span>}
                {active && !sidebarCollapsed && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-2 py-1 bg-slate-700 text-slate-100 text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-600 shadow-lg">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-slate-700/60 space-y-2">
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl bg-slate-800/60 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden lg:flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <span className="text-base w-5 flex justify-center">
              <FontAwesomeIcon icon={sidebarCollapsed ? faArrowRight : faArrowLeft} />
            </span>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
          
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <span className="text-base w-5 flex justify-center">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-slate-700/60 bg-slate-900/95 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              {NAV_ITEMS.find(item => item.href === pathname)?.label || "Dashboard"}
            </h2>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/ai-coach"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faRobot} />
              <span>Ask Coach</span>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}