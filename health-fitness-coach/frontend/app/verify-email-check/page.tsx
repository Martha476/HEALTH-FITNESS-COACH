"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function VerifyEmailCheckPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResendEmail = async () => {
    if (!email) {
      setError("Email address not found. Please register again.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || "Failed to resend email");
      }

      const data = await res.json();
      setMessage(data.message || "Verification email resent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30 mb-5 animate-pulse">
            <span className="text-5xl">✉️</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Check Your Email
          </h1>
          <p className="text-slate-400 mt-3 text-base">
            We've sent a verification link to verify your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 px-8 py-10 sm:px-10 sm:py-12 border border-slate-700/50">
          <div className="space-y-6">
            {/* Email Display */}
            {email && (
              <div className="bg-slate-700/50 rounded-xl px-4 py-3 border border-slate-600/50">
                <p className="text-sm text-slate-400 mb-1">Verification email sent to:</p>
                <p className="text-slate-100 font-medium break-all">{email}</p>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-start gap-3 bg-green-900/30 border border-green-700/50 rounded-xl px-4 py-3 text-green-300 text-sm">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{message}</span>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-700/30 rounded-xl px-4 py-4 text-sm text-slate-300 space-y-3">
              <div className="flex gap-3">
                <span className="text-green-400 font-bold shrink-0">1.</span>
                <p>Check your email inbox for a message from FitCoach AI</p>
              </div>
              <div className="flex gap-3">
                <span className="text-green-400 font-bold shrink-0">2.</span>
                <p>Click the verification link in the email to verify your address</p>
              </div>
              <div className="flex gap-3">
                <span className="text-green-400 font-bold shrink-0">3.</span>
                <p>The link will expire in 24 hours for security</p>
              </div>
            </div>

            {/* Checkbox for spam folder */}
            <div className="bg-slate-700/30 rounded-xl px-4 py-3 text-cm text-slate-300">
              <p>💡 <span className="text-slate-400">Didn't receive it? Check your spam or junk folder</span></p>
            </div>

            {/* Resend Button */}
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-green-500/25"
            >
              {resending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sending verification email...
                </span>
              ) : (
                "Resend Verification Email"
              )}
            </button>

            {/* Help Links */}
            <div className="space-y-2 text-center text-sm">
              <p className="text-slate-400">
                <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
                  Back to Login
                </Link>
              </p>
              <p className="text-slate-400">
                <Link href="/register" className="text-green-400 hover:text-green-300 font-medium">
                  Create a different account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          <p>Questions? <Link href="/help" className="text-green-400 hover:text-green-300 font-medium">Contact support</Link></p>
        </div>
      </div>
    </div>
  );
}
