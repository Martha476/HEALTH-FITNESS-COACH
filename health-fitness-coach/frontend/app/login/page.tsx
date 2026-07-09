"use client";

import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return "Please enter a valid email address";
  return null;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [error,           setError]           = useState("");
  const [emailError,      setEmailError]      = useState("");
  const [emailTouched,    setEmailTouched]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [showPassword,    setShowPassword]    = useState(false);
  // ✅ NEW: track unverified email state
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading,   setResendLoading]   = useState(false);
  const [resendSuccess,   setResendSuccess]   = useState(false);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setEmail(val);
      setError("");
      setUnverifiedEmail("");
      if (emailTouched) setEmailError(validateEmail(val) || "");
    },
    [emailTouched]
  );

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    setEmailError(validateEmail(email) || "");
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setResendSuccess(false);

    const emailValidation = validateEmail(email);
    if (emailValidation) { setEmailError(emailValidation); setEmailTouched(true); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.message || "Login failed. Please try again.";
      // ✅ Detect unverified email error (403)
      if (msg.toLowerCase().includes("verify your email") ||
          msg.toLowerCase().includes("verification") ||
          err.status === 403) {
        setUnverifiedEmail(email);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend verification email
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: unverifiedEmail }),
      });
      if (res.ok) {
        setResendSuccess(true);
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to resend verification email.");
        setUnverifiedEmail("");
      }
    } catch {
      setError("Could not resend verification email. Please try again.");
      setUnverifiedEmail("");
    } finally {
      setResendLoading(false);
    }
  };

  const isEmailValid = emailTouched && !emailError && email.length > 0;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-slate-900 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 ring-1 ring-green-500/40 mb-5">
            <span className="text-5xl">🏋️</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">FitCoach AI</h1>
          <p className="text-slate-300 mt-2 text-sm">Your personal AI-powered fitness companion</p>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-2xl px-6 py-8 sm:px-10 sm:py-10 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-6 text-center">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ✅ Email not verified banner */}
            {unverifiedEmail && !resendSuccess && (
              <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl px-4 py-3 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">📧</span>
                  <div>
                    <p className="text-amber-200 text-sm font-semibold">Email not verified</p>
                    <p className="text-amber-300/80 text-xs mt-0.5">
                      Please verify <strong>{unverifiedEmail}</strong> before logging in.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend Verification Email →"}
                </button>
              </div>
            )}

            {/* ✅ Resend success */}
            {resendSuccess && (
              <div className="bg-green-900/30 border border-green-600/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-green-300 text-sm">
                  <span>✅</span>
                  <p>Verification email sent! Check your inbox and click the link.</p>
                </div>
              </div>
            )}

            {/* General error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span>{error}</span>
                  {error.toLowerCase().includes("no account") && (
                    <div className="mt-2">
                      <Link href="/register"
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                        Create Free Account →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input id="email" type="email" value={email} onChange={handleEmailChange}
                  onBlur={handleEmailBlur} required autoComplete="email" placeholder="you@example.com"
                  className={`w-full pl-11 pr-10 py-3 bg-slate-700/50 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                    emailError && emailTouched ? "border-red-500/70 focus:ring-red-500"
                    : isEmailValid ? "border-green-500/50 focus:ring-green-500"
                    : "border-slate-600/70 focus:ring-green-500"}`} />
                {isEmailValid && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {emailError && emailTouched && <p className="text-red-400 text-xs pl-1">{emailError}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required minLength={6} autoComplete="current-password" placeholder="••••••••"
                  className={`w-full pl-11 pr-11 py-3 bg-slate-700/50 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${
                    password.length > 0 ? "border-green-500/50 focus:ring-green-500" : "border-slate-600/70 focus:ring-green-500"}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? (
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
            </div>

            {/* Forgot password */}
            <div className="flex justify-end -mt-1">
              <Link href="/forgot-password" className="text-xs text-green-400 hover:text-green-300 transition-colors hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/25">
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In →"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center space-y-2">
            <p className="text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">Powered by AI · Your data is secure</p>
      </div>
    </div>
  );
}