"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../app/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faRobot, faDumbbell, faUtensils, faChartLine, faUser, faCog, faQuestionCircle, faSignOutAlt, faBars, faTimes } from "@fortawesome/free-solid-svg-icons";

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

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

  return (
    <nav className="bg-gradient-to-r from-green-700 to-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl flex items-center"><FontAwesomeIcon icon={faDumbbell} /></span>
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
                <span className="w-4 flex justify-center items-center"><FontAwesomeIcon icon={item.icon} /></span>
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={logout}
                className="ml-2 px-3 py-2 rounded-lg text-white hover:bg-red-600/80 transition-colors flex items-center gap-1 text-sm"
              >
                <span className="w-4 flex justify-center items-center"><FontAwesomeIcon icon={faSignOutAlt} /></span>
                <span>Logout</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 hover:bg-green-600 rounded-lg transition-colors flex items-center justify-center"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <span className="text-xl flex items-center"><FontAwesomeIcon icon={isOpen ? faTimes : faBars} /></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-green-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 flex items-center gap-3 rounded transition-colors ${
                  pathname === item.href
                    ? "bg-white text-green-700 font-semibold"
                    : "text-white hover:bg-green-600"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <span className="w-5 flex justify-center text-lg"><FontAwesomeIcon icon={item.icon} /></span>
                <span>{item.label}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="block w-full text-left px-4 py-2 flex items-center gap-3 rounded text-white hover:bg-red-600/80 transition-colors mt-2"
              >
                <span className="w-5 flex justify-center text-lg"><FontAwesomeIcon icon={faSignOutAlt} /></span>
                <span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
