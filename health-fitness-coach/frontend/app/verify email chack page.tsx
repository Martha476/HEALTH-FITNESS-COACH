"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VerifyEmailCheckPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [resending,  setResending]  = useState(false);
  const [resent,     setResent]     = useState(false);
  const [resendErr,  setResendErr]  = useState("");

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setResendErr("");
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      if (res.ok) {
        setResent(true);
      } else {
        const data = await res.json();
        setResendErr(data.detail || "Failed to resend. Please try again.");
      }
    } catch {
      setResendErr("Could not connect. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-slate-900 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 ring-1 ring-green-500/40 mb-5">
            <span className="text-5xl">🏋️</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">FitCoach AI</h1>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-2xl px-6 py-8 sm:px-10 sm:py-10 border border-slate-700/50">

          <div className="text-center space-y-4">
            <div className="text-6xl">📧</div>
            <h2 className="text-2xl font-bold text-slate-100">Check your email!</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We sent a verification link to{" "}
              {email && <span className="text-green-400 font-semibold block mt-1">{email}</span>}
            </p>
          </div>

          {/* Steps */}
          <div className="mt-6 bg-slate-700/40 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">What to do:</p>
            {[
              "Open the email from FitCoach AI",
              "Click the 'Verify Email' button",
              "You'll be redirected to login",
              "Sign in and start your fitness journey!",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0 font-bold">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>

          {/* Spam notice */}
          <div className="mt-4 bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
            <p className="text-amber-300 text-xs">
              📂 <strong>Don't see the email?</strong> Check your spam or junk folder. It may take up to 2 minutes to arrive.
            </p>
          </div>

          {/* Resend */}
          <div className="mt-5 text-center space-y-2">
            {resent ? (
              <p className="text-green-400 text-sm">✓ New verification email sent!</p>
            ) : (
              <>
                <p className="text-slate-500 text-xs">Didn't receive it?</p>
                <button
                  onClick={handleResend}
                  disabled={resending || !email}
                  className="text-sm text-green-400 hover:text-green-300 font-semibold transition-colors disabled:opacity-50 underline"
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
                {resendErr && <p className="text-red-400 text-xs">{resendErr}</p>}
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center space-y-2">
            <Link href="/login"
              className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Already verified? Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by AI · Your data is secure
        </p>
      </div>
    </div>
  );
}