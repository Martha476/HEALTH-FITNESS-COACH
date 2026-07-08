"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faHome, faRobot, faDumbbell, faUtensils, faChartLine, 
  faUser, faCog, faQuestionCircle, faSignOutAlt, faBars, faTimes 
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

export default function TopNavBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: faHome },
    { label: "AI Coach", href: "/ai-coach", icon: faRobot },
    { label: "Workouts", href: "/workouts", icon: faDumbbell },
    { label: "Nutrition", href: "/nutrition", icon: faUtensils },
    { label: "Progress", href: "/progress", icon: faChartLine },
    { label: "Profile", href: "/profile", icon: faUser },
    { label: "Settings", href: "/settings", icon: faCog },
    { label: "Help", href: "/help", icon: faQuestionCircle },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500 border-b border-cyan-300/30 shadow-xl shadow-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 font-bold text-lg text-white hover:text-cyan-100 transition-colors shrink-0 drop-shadow-md"
          >
            <span className="text-2xl">💪</span>
            <span className="hidden sm:inline">FitCoach AI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1 flex-1 ml-6">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-white/25 text-white border border-white/40 backdrop-blur-sm"
                    : "text-white hover:text-white hover:bg-white/15"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right Side Menu (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.slice(5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                  isActive(item.href)
                    ? "bg-white/25 text-white border border-white/40 backdrop-blur-sm"
                    : "text-white hover:text-white hover:bg-white/15"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
              </Link>
            ))}
            
            {user && (
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:text-white hover:bg-red-500/30 transition-all ml-2 border border-white/20 hover:border-white/40"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/15 transition-all border border-white/20 hover:border-white/40"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-3 border-t border-white/20 bg-gradient-to-b from-cyan-500 to-teal-500">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive(item.href)
                    ? "bg-white/25 text-white border-l-4 border-white"
                    : "text-white hover:text-white hover:bg-white/15"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium rounded-lg text-white hover:text-white hover:bg-red-500/30 transition-all mt-2"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
