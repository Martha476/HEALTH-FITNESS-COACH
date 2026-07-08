"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!email || !token) {
        setStatus("error");
        setMessage("Invalid verification link. Missing email or token.");
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(err.message || err.detail || "Email verification failed");
          return;
        }

        const data = await res.json();
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "An error occurred while verifying your email");
      }
    };

    verifyEmail();
  }, [email, token, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30 mb-5">
            <span className="text-5xl">
              {status === "loading" && "⏳"}
              {status === "success" && "✅"}
              {status === "error" && "❌"}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            {status === "loading" && "Verifying Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 px-8 py-10 sm:px-10 sm:py-12 border border-slate-700/50">
          <div className="space-y-6">
            {/* Loading State */}
            {status === "loading" && (
              <div className="text-center space-y-4">
                <svg className="w-10 h-10 animate-spin mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-slate-300">Please wait while we verify your email...</p>
              </div>
            )}

            {/* Success State */}
            {status === "success" && (
              <div className="space-y-4">
                <p className="text-slate-300 text-center">{message}</p>
                <p className="text-slate-400 text-sm text-center">
                  Redirecting to login page in a few seconds...
                </p>
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 animate-pulse" style={{ animation: "pulse 3s ease-in-out" }}></div>
                </div>
                <Link
                  href="/login"
                  className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 text-center"
                >
                  Go to Login Now
                </Link>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="space-y-4">
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {message}
                </div>
                <div className="bg-slate-700/30 rounded-xl px-4 py-4 text-sm text-slate-300 space-y-3">
                  <p className="font-semibold text-slate-200">What you can do:</p>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="text-green-400">•</span>
                      <span>Go back and try the verification link again</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400">•</span>
                      <span>Request a new verification email</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400">•</span>
                      <span>Check if the link has expired (24 hours)</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <Link
                    href={email ? `/verify-email-check?email=${encodeURIComponent(email)}` : "/verify-email-check"}
                    className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 text-center"
                  >
                    Resend Verification Email
                  </Link>
                  <Link
                    href="/login"
                    className="block w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-200 text-center"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Support */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          <p>Need help? <Link href="/help" className="text-green-400 hover:text-green-300 font-medium">Contact support</Link></p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-slate-900">
          <p className="text-slate-400">Verifying...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
