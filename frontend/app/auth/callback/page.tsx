"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { redirectAfterLogin, validateSession } from "../../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function parseJwtUser(token: string) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string) || payload.email?.split("@")[0] || "User",
    email_verified: true,
  };
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const errorParam =
        searchParams.get("error_description") || searchParams.get("error");
      const rawToken = searchParams.get("token");

      if (errorParam) {
        const msg = decodeURIComponent(errorParam.replace(/\+/g, " "));
        setError(
          msg === "google_not_configured"
            ? "Google sign-in is not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env."
            : msg
        );
        return;
      }

      if (!rawToken) {
        setError("No authentication token received. Please try signing in again.");
        return;
      }

      const token = decodeURIComponent(rawToken);

      try {
        let user = await validateSession(token);

        if (!user) {
          const meRes = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            user = await meRes.json();
          } else {
            const body = await meRes.json().catch(() => ({}));
            throw new Error(
              typeof body.detail === "string"
                ? body.detail
                : "Could not verify your account. Is the backend running?"
            );
          }
        }

        if (!user) {
          user = parseJwtUser(token);
        }

        await redirectAfterLogin(token, user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      }
    };

    run();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-900 px-4">
        <div className="max-w-md w-full bg-slate-800/70 border border-slate-700/50 rounded-2xl p-8 text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              Back to Login
            </Link>
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
              Go to home page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800/70 border border-slate-700/50 rounded-2xl p-8 text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto" />
        <p className="text-slate-200">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
