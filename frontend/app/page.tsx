"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getStoredToken,
  resolvePostLoginPath,
  validateSession,
} from "../lib/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrain,
  faChartLine,
  faBolt,
  faShield,
  faSmile,
  faDumbbell,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

// Image paths
const CAROUSEL_IMAGES = [
  { 
    url: "/images/download (14).jpg", 
    title: "Smart Workouts", 
    caption: "AI-powered exercise guidance" 
  },
  { 
    url: "/images/Health and Fitness.jpg", 
    title: "Fitness Journey", 
    caption: "Track your progress daily" 
  },
  { 
    url: "/images/Healthy Habits That Support Weight Loss Naturally.jpg", 
    title: "Healthy Habits", 
    caption: "Build lasting routines" 
  },
  { 
    url: "/images/Healthy Lifestyle.jpg", 
    title: "Active Lifestyle", 
    caption: "Live your best life" 
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Only redirect users with a valid session (not stale tokens/cookies)
  useEffect(() => {
    if (isLoading) return;

    const routeSignedInUser = async () => {
      const token = getStoredToken();
      if (!token) return;

      const verified = user ?? (await validateSession(token));
      if (!verified) return;

      const path = await resolvePostLoginPath(token, verified);
      router.replace(path);
    };

    routeSignedInUser();
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? CAROUSEL_IMAGES.length - 1 : prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Don't render landing page if user is logged in (redirect happens in useEffect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950 via-cyan-950 to-teal-950 text-white">
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-slate-900/95 backdrop-blur-md shadow-lg" : "bg-slate-900/80 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div 
            className="text-2xl font-bold bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-xl">
              💪
            </div>
            FitCoach AI
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 text-teal-300 border border-teal-500/50 rounded-lg font-semibold hover:bg-teal-500/10 hover:border-teal-400 transition-all duration-300"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/register")}
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/30 transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Carousel */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Carousel Background */}
        <div className="absolute inset-0">
          {CAROUSEL_IMAGES.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  console.error(`Failed to load: ${image.url}`);
                  e.currentTarget.src = "https://via.placeholder.com/1920x1080?text=Fitness+Image";
                }}
              />
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-20 text-center px-4 md:px-8 max-w-4xl mx-auto">
          <div className="inline-block mb-6 px-4 py-2 bg-teal-500/20 border border-teal-400/30 rounded-full text-sm backdrop-blur-sm animate-pulse">
            <span className="text-teal-300">✨ AI-Powered Fitness</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight animate-fadeIn">
            Your Personal{" "}
            <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
              AI Fitness Coach
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Personalized workouts • Smart nutrition • Real-time coaching
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/register")}
              className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl font-bold text-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/50 transform hover:scale-105 flex items-center gap-2 justify-center"
            >
              Start Your Journey
              <FontAwesomeIcon icon={faArrowRight} className="text-sm group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Carousel Navigation Arrows */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between z-30 px-4">
            <button
              onClick={goToPrevSlide}
              className="w-10 h-10 bg-black/50 hover:bg-teal-500/50 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              ❮
            </button>
            <button
              onClick={goToNextSlide}
              className="w-10 h-10 bg-black/50 hover:bg-teal-500/50 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              ❯
            </button>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-12">
            {CAROUSEL_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 hover:scale-110 ${
                  index === currentSlide
                    ? "bg-teal-400 w-8"
                    : "bg-white/40 w-2 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          {/* Current Image Title */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-teal-300">
              {CAROUSEL_IMAGES[currentSlide].title}
            </h3>
            <p className="text-gray-400 text-sm">
              {CAROUSEL_IMAGES[currentSlide].caption}
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid - Mint Green Theme */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Everything You Need
          </h2>
          <p className="text-gray-400 mt-2">Powered by advanced AI</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: faBrain, title: "Smart AI", color: "teal" },
            { icon: faDumbbell, title: "Workouts", color: "cyan" },
            { icon: faBolt, title: "Nutrition", color: "teal" },
            { icon: faChartLine, title: "Progress", color: "cyan" },
            { icon: faSmile, title: "24/7 Coach", color: "teal" },
            { icon: faShield, title: "Secure", color: "cyan" },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="group p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700 rounded-xl hover:border-teal-500/50 transition-all duration-300 hover:scale-105 hover:bg-slate-800/60 cursor-pointer text-center"
            >
              <div className={`mb-2 p-2 bg-${feature.color}-500/20 border border-${feature.color}-400/30 rounded-lg w-fit mx-auto group-hover:scale-110 transition-transform`}>
                <FontAwesomeIcon icon={feature.icon} className={`text-lg text-${feature.color}-400`} />
              </div>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-teal-500/5 to-cyan-500/5 rounded-2xl p-8 border border-teal-500/10">
          <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
            How It Works
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Sign Up", desc: "Create account" },
              { step: "02", title: "Set Goals", desc: "Share targets" },
              { step: "03", title: "Get Plan", desc: "AI creates" },
              { step: "04", title: "Start", desc: "Train smart" },
            ].map((step, idx) => (
              <div key={idx} className="text-center group cursor-pointer">
                <div className="text-3xl font-bold bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  {step.step}
                </div>
                <h4 className="font-semibold text-white">{step.title}</h4>
                <p className="text-gray-500 text-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all hover:scale-105">
            <div className="text-3xl font-bold text-teal-400">100+</div>
            <div className="text-gray-400 text-sm">Exercises</div>
          </div>
          <div className="text-center p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all hover:scale-105">
            <div className="text-3xl font-bold text-teal-400">50K+</div>
            <div className="text-gray-400 text-sm">Users</div>
          </div>
          <div className="text-center p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all hover:scale-105">
            <div className="text-3xl font-bold text-teal-400">99%</div>
            <div className="text-gray-400 text-sm">Success</div>
          </div>
          <div className="text-center p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all hover:scale-105">
            <div className="text-3xl font-bold text-teal-400">24/7</div>
            <div className="text-gray-400 text-sm">Support</div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Alex J.", text: "Life-changing!", emoji: "💪" },
            { name: "Sarah C.", text: "Best app ever!", emoji: "🏃" },
            { name: "Mike R.", text: "Game changer!", emoji: "🦾" },
          ].map((t, idx) => (
            <div key={idx} className="p-5 bg-slate-800/30 border border-slate-700 rounded-xl hover:border-teal-500/30 transition-all hover:scale-105 group cursor-pointer">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{t.emoji}</div>
              <p className="text-gray-300 text-sm mb-2">"{t.text}"</p>
              <p className="font-semibold text-teal-400 text-sm">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-center transform hover:scale-105 transition-transform duration-300">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Ready to Transform?
          </h2>
          <p className="text-teal-100 mb-4 text-sm">Join 50,000+ happy users</p>
          <button
            onClick={() => router.push("/register")}
            className="px-8 py-3 bg-white text-teal-600 font-bold rounded-lg hover:bg-gray-100 transition-all duration-300 hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-2"
          >
            Start Free
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm">© 2026 FitCoach AI • AI-Powered Fitness Coaching</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}