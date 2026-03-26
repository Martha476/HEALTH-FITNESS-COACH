"use client";

import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  return null;
}

// Password strength calculation
function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", color: "text-red-400" };
  if (score === 3) return { score, label: "Fair", color: "text-yellow-400" };
  if (score === 4) return { score, label: "Good", color: "text-blue-400" };
  return { score, label: "Strong", color: "text-green-400" };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "" });

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    setError("");
    if (emailTouched) {
      setEmailError(validateEmail(val) || "");
    }
  }, [emailTouched]);

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    setEmailError(validateEmail(email) || "");
  }, [email]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setError("");
    setPasswordStrength(calculatePasswordStrength(val));
    setPasswordTouched(val.length > 0);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate name
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      setEmailTouched(true);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setPasswordTouched(true);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = emailTouched && !emailError && email.length > 0;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-slate-900 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Hero Banner */}
        <div className="text-center mb-6">
          <div className="relative w-full h-28 mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-teal-600/20 border border-green-500/30">
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              <div className="text-5xl animate-bounce">🎯</div>
              <div className="text-6xl">💪</div>
              <div className="text-5xl animate-bounce" style={{animationDelay: '0.2s'}}>🚀</div>
            </div>
          </div>
        </div>
        
        {/* Logo & Branding */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30 mb-5">
            <span className="text-5xl">🏋️</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            FitCoach AI
          </h1>
          <p className="text-slate-400 mt-3 text-base">
            Start your fitness journey today
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 px-8 py-10 sm:px-10 sm:py-12 border border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-100 mb-8 text-center">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm animate-in fade-in duration-200">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  required
                  minLength={2}
                  autoComplete="name"
                  className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/70 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Field */}
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
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  autoComplete="email"
                  className={`w-full pl-11 pr-10 py-3 bg-slate-700/50 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-base ${
                    emailError && emailTouched
                      ? "border-red-500/70 focus:ring-red-500"
                      : (isEmailValid || document.activeElement === document.getElementById('email') || email.length > 0)
                      ? "border-green-500/50 focus:ring-green-500"
                      : "border-slate-600/70 focus:ring-green-500"
                  }`}
                  placeholder="you@example.com"
                />
                {isEmailValid && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {emailError && emailTouched && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {emailError && emailTouched && (
                <p className="text-red-400 text-xs mt-1 pl-1">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-11 py-3 bg-slate-700/50 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-base ${
                    password.length > 0 || document.activeElement === document.getElementById('password')
                      ? "border-green-500/50 focus:ring-green-500"
                      : "border-slate-600/70 focus:ring-green-500"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordTouched && password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Password strength:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? "bg-red-500"
                              : passwordStrength.score === 3
                              ? "bg-yellow-500"
                              : passwordStrength.score === 4
                              ? "bg-blue-500"
                              : "bg-green-500"
                            : "bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 mt-2">
                    <p className="text-xs text-slate-400 mb-2">Password should contain:</p>
                    <ul className="space-y-1 text-xs">
                      <li className={password.length >= 8 ? "text-green-400" : "text-slate-500"}>
                        {password.length >= 8 ? "✓" : "○"} At least 8 characters
                      </li>
                      <li className={/[A-Z]/.test(password) ? "text-green-400" : "text-slate-500"}>
                        {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase letter
                      </li>
                      <li className={/[a-z]/.test(password) ? "text-green-400" : "text-slate-500"}>
                        {/[a-z]/.test(password) ? "✓" : "○"} Lowercase letter
                      </li>
                      <li className={/\d/.test(password) ? "text-green-400" : "text-slate-500"}>
                        {/\d/.test(password) ? "✓" : "○"} Number
                      </li>
                      <li className={/[^a-zA-Z0-9]/.test(password) ? "text-green-400" : "text-slate-500"}>
                        {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Special character (optional)
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-11 py-3 bg-slate-700/50 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-base ${
                    confirmPassword.length > 0 && password !== confirmPassword
                      ? "border-red-500/70 focus:ring-red-500"
                      : (passwordsMatch || document.activeElement === document.getElementById('confirmPassword') || confirmPassword.length > 0)
                      ? "border-green-500/50 focus:ring-green-500"
                      : "border-slate-600/70 focus:ring-green-500"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1 pl-1">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-green-400 text-xs mt-1 pl-1">✓ Passwords match</p>
              )}
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-semibold text-base hover:from-green-500 hover:to-green-400 active:from-green-700 active:to-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/25"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create Account
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-green-400 hover:text-green-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-8">
          Powered by AI &middot; Your data is secure
        </p>
      </div>
    </div>
  );
}
