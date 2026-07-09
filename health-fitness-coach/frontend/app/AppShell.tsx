"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState }    from "react";
import { AuthProvider, useAuth }  from "./context/AuthContext";
import Navigation                 from "@/components/Navigation";

const PUBLIC_PATHS        = ["/login", "/register"];
const PROFILE_SETUP_PATH  = "/profile";
const NO_NAVBAR_PATHS     = ["/dashboard"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading }   = useAuth();
  const pathname              = usePathname();
  const router                = useRouter();

  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const isPublic      = PUBLIC_PATHS.includes(pathname);
  const isProfilePage = pathname === PROFILE_SETUP_PATH;
  const hideNavbar    = NO_NAVBAR_PATHS.some((p) => pathname.startsWith(p));

  // ── FIX 2: Profile completion check ───────────────────────────────────────
  // Checks BOTH the dedicated "profileComplete" flag AND the profile fields.
  // This prevents AppShell from redirecting back to /profile after saving.
  useEffect(() => {
    if (user && !isPublic) {
      // First check the fast dedicated flag set by profile page on save
      const quickFlag = localStorage.getItem("profileComplete");
      if (quickFlag === "true") {
        setProfileComplete(true);
        return;
      }

      // Fall back to checking individual profile fields
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        try {
          const profile    = JSON.parse(savedProfile);
          const isComplete = !!(
            profile.age           &&
            profile.currentWeight &&
            profile.primaryGoal   &&
            profile.activityLevel
          );
          setProfileComplete(isComplete);
          // Cache the result so next check is instant
          if (isComplete) {
            localStorage.setItem("profileComplete", "true");
          }
        } catch {
          setProfileComplete(false);
        }
      } else {
        setProfileComplete(false);
      }
    }
  }, [user, isPublic, pathname]); // re-run on pathname change so returning
                                   // from /profile triggers a fresh check

  // ── Route guards ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && isPublic) {
      router.replace("/dashboard");
      return;
    }
    // Only redirect to /profile if profile is definitively incomplete (false)
    // null means "still checking" — don't redirect yet
    if (
      user &&
      profileComplete === false &&
      !isProfilePage &&
      pathname !== "/"
    ) {
      router.replace("/profile");
      return;
    }
  }, [user, isLoading, isPublic, isProfilePage, profileComplete, router, pathname]);

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="text-8xl mb-4 animate-bounce">🏋️</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-slate-400 text-lg mt-8">Loading your fitness journey...</p>
        </div>
      </div>
    );
  }

  // ── Profile check in progress — show spinner, not a redirect ──────────────
  if (user && !isPublic && profileComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <p className="text-slate-400 text-lg">Setting up...</p>
        </div>
      </div>
    );
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!user && !isPublic) return null;
  if (user  && isPublic)  return null;

  // ── Public pages — no chrome ───────────────────────────────────────────────
  if (isPublic) return <>{children}</>;

  // ── Dashboard — has its own sidebar ───────────────────────────────────────
  if (hideNavbar) return <>{children}</>;

  // ── All other authenticated pages — green navbar ───────────────────────────
  return (
    <>
      <Navigation />
      <main className="w-full min-h-screen pt-6 pb-16">
        {children}
      </main>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}