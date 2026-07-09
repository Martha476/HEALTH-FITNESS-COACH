"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");
  const [token,       setToken]       = useState<string | null>(null)
  const [tokenError,  setTokenError]  = useState(false);

  // ── Extract access_token from URL ────────────────
  useEffect(() => {
    // Supabase puts the token in the URL hash OR query param
    const queryToken = searchParams.get("access_token")
    const hashToken  = typeof window !== "undefined"
      ? new URLSearchParams(window.location.hash.replace("#", "")).get("access_token")
      : null

    const resolved = queryToken || hashToken
    if (resolved) {
      setToken(resolved)
    } else {
      setTokenError(true)
    }
  }, [searchParams])

  // ── Password strength ─────────────────────────────
  const getStrength = (p: string) => {
    let score = 0
    if (p.length >= 8)                      score++
    if (/[A-Z]/.test(p))                    score++
    if (/[0-9]/.test(p))                    score++
    if (/[^A-Za-z0-9]/.test(p))             score++
    return score
  }
  const strength = getStrength(password)
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength] || ""
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][strength] || ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6)      { setError("Password must be at least 6 characters"); return }
    if (password !== confirm)      { setError("Passwords do not match"); return }
    if (!token)                    { setError("Invalid reset link. Please request a new one."); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ access_token: token, new_password: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Reset failed")
      setSuccess(true)
      // Auto-redirect to login after 3 seconds
      setTimeout(() => router.push("/login"), 3000)
    } catch (err: any) {
      setError(err.message || "Password reset failed. Please try again.")
    } finally {
      setLoading(false)
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

          {/* Invalid token */}
          {tokenError && (
            <div className="text-center space-y-4">
              <div className="text-5xl">⚠️</div>
              <h2 className="text-xl font-bold text-slate-100">Invalid Reset Link</h2>
              <p className="text-slate-400 text-sm">
                This reset link is invalid or has expired. Reset links are only valid for 1 hour.
              </p>
              <Link href="/forgot-password"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors">
                Request New Reset Link →
              </Link>
            </div>
          )}

          {/* Success screen */}
          {success && (
            <div className="text-center space-y-4">
              <div className="text-6xl">✅</div>
              <h2 className="text-xl font-bold text-slate-100">Password Reset!</h2>
              <p className="text-slate-400 text-sm">
                Your password has been updated successfully.
                Redirecting you to login in 3 seconds...
              </p>
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-1.5 rounded-full animate-[shrink_3s_linear_forwards]" style={{ width: "100%" }} />
              </div>
              <Link href="/login" className="inline-block text-green-400 hover:text-green-300 text-sm font-semibold">
                Go to Login Now →
              </Link>
            </div>
          )}

          {/* Reset form */}
          {!tokenError && !success && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔒</div>
                <h2 className="text-xl font-bold text-slate-100">Set New Password</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); setError("") }}
                      required minLength={6} autoFocus placeholder="Min 6 characters"
                      className="w-full pl-11 pr-11 py-3 bg-slate-700/50 border border-slate-600/70 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                    <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300">
                      {showPass ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map((i) => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= strength ? strengthColor : "bg-slate-600"}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${strengthColor.replace("bg-", "text-")}`}>
                        {strengthLabel} password
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input type={showPass ? "text" : "password"} value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError("") }}
                      required placeholder="Repeat your password"
                      className={`w-full pl-11 pr-4 py-3 bg-slate-700/50 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                        confirm.length > 0
                          ? confirm === password ? "border-green-500/50 focus:ring-green-500" : "border-red-500/50 focus:ring-red-500"
                          : "border-slate-600/70 focus:ring-green-500"}`} />
                  </div>
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-red-400 text-xs">Passwords do not match</p>
                  )}
                  {confirm.length > 0 && confirm === password && (
                    <p className="text-green-400 text-xs">✓ Passwords match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || password !== confirm || password.length < 6}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/25 pt-2">
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Resetting...
                    </span>
                  ) : "Reset Password →"}
                </button>
              </form>
            </>
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