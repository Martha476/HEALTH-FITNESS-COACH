"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Status = "verifying" | "success" | "error" | "resending" | "resent";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [status,  setStatus]  = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(email);

  // ── Auto-verify if token present in URL ──────────
  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link. Please request a new one.");
      return;
    }
    verifyToken();
  }, []);

  async function verifyToken() {
    setStatus("verifying");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        // Auto-redirect to login after 3 seconds
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setStatus("error");
        setMessage(data.detail || "Verification failed. The link may have expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not connect to server. Please try again.");
    }
  }

  async function handleResend() {
    if (!resendEmail.trim()) return;
    setStatus("resending");
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("resent");
        setMessage(`A new verification link has been sent to ${resendEmail}.`);
      } else {
        setStatus("error");
        setMessage(data.detail || "Failed to resend. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not connect to server. Please try again.");
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

          {/* Verifying */}
          {status === "verifying" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-14 w-14 text-green-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-100">Verifying your email...</h2>
              <p className="text-slate-400 text-sm">Please wait a moment.</p>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="text-6xl">✅</div>
              <h2 className="text-xl font-bold text-slate-100">Email Verified!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
              <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4 space-y-2">
                <p className="text-green-300 text-sm font-semibold">You can now access FitCoach AI!</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {["Track workouts", "Get AI coaching", "Monitor nutrition", "See your progress"].map((f, i) => (
                    <span key={i} className="bg-slate-700/50 px-2 py-1 rounded-lg">{f}</span>
                  ))}
                </div>
              </div>
              <p className="text-slate-500 text-xs">Redirecting to login in 3 seconds...</p>
              <Link href="/login"
                className="inline-block bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-green-400 transition-all shadow-lg shadow-green-600/25">
                Go to Login Now →
              </Link>
            </div>
          )}

          {/* Error */}
          {(status === "error") && (
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <div className="text-5xl">⚠️</div>
                <h2 className="text-xl font-bold text-slate-100">Verification Failed</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {message || "This verification link is invalid or has expired."}
                </p>
              </div>

              {/* Resend form */}
              <div className="bg-slate-700/40 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">Request a new verification link:</p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <button
                  onClick={handleResend}
                  disabled={!resendEmail.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  Resend Verification Email
                </button>
              </div>
            </div>
          )}

          {/* Resending */}
          {status === "resending" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-12 w-12 text-green-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-100">Sending new link...</h2>
            </div>
          )}

          {/* Resent success */}
          {status === "resent" && (
            <div className="text-center space-y-4">
              <div className="text-6xl">📬</div>
              <h2 className="text-xl font-bold text-slate-100">Email Sent!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
              <div className="bg-slate-700/40 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Next steps:</p>
                {["Check your inbox (and spam folder)", "Click the verification link", "Come back to login"].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setStatus("error"); setMessage(""); }}
                className="text-xs text-slate-400 hover:text-slate-300 underline"
              >
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