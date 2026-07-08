"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./context/AuthContext"; // ← Correct path
import AppShell from "./AppShell";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  
  // Pages that should NOT use AppShell (landing page, login, register)
  const noAppShellPages = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
  
  // Show AppShell only for authenticated users on protected pages
  const shouldUseAppShell = !noAppShellPages.includes(pathname || "") && user && !isLoading;
  
  if (shouldUseAppShell) {
    return <AppShell>{children}</AppShell>;
  }
  
  return <>{children}</>;
}