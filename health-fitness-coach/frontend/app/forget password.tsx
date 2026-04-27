"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      // Always show success (even if email not found — security best practice)
      setSent(true);
    } catch {
      // Still show success to prevent user enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

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

          {!sent ? (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔑</div>
                <h2 className="text-xl font-bold text-slate-100">Forgot your password?</h2>
                <p className="text-slate-400 text-sm mt-2">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input id="email" type="email" value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      required placeholder="you@example.com" autoFocus
                      className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/70 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/25">
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : "Send Reset Link →"}
                </button>
              </form>
            </>
          ) : (
            /* ── Success screen ── */
            <div className="text-center space-y-4">
              <div className="text-6xl mb-2">📬</div>
              <h2 className="text-xl font-bold text-slate-100">Check your inbox!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                If an account exists for <span className="text-green-400 font-semibold">{email}</span>,
                you'll receive a password reset link shortly.
              </p>
              <div className="bg-slate-700/50 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">What to do next:</p>
                <div className="space-y-1.5">
                  {["Check your email inbox (and spam folder)", "Click the reset link in the email", "Enter your new password", "Sign in with your new password"].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => { setSent(false); setEmail(""); }}
                className="text-xs text-slate-400 hover:text-slate-300 underline">
                Didn't receive it? Try again
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
            <Link href="/login" className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}