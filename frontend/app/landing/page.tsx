"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeartPulse,
  faFire,
  faDumbbell,
  faDroplet,
  faLeaf,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = [
    "download (14).jpg",
    "Health and Fitness.jpg",
    "Healthy Habits That Support Weight Loss Naturally.jpg",
    "Healthy Lifestyle.jpg",
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-cyan-900 to-cyan-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-cyan-950/95 backdrop-blur-md shadow-lg shadow-cyan-600/20" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent flex items-center gap-2">
            <div className="text-3xl">💪</div>
            FitCoach AI
          </div>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:from-cyan-600 hover:to-teal-600 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/50"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section with Image Carousel */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 md:px-8 max-w-7xl w-full items-center">
          {/* Left: Content */}
          <div className="text-left space-y-6">
            <div className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-sm">
              <span className="text-cyan-300">✨ AI-Powered Fitness</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Your Personal AI{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                Fitness Coach
              </span>
            </h1>

            <p className="text-lg text-cyan-100 max-w-md">
              Personalized workouts, nutrition plans, and real-time coaching powered by AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => router.push("/register")}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-bold hover:from-cyan-600 hover:to-teal-600 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/50 transform hover:scale-105"
              >
                Get Started
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-8 py-3 bg-cyan-900/50 border border-cyan-400/30 rounded-lg font-bold hover:bg-cyan-900 transition-all duration-300"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right: Image Carousel */}
          <div className="relative h-96 lg:h-[500px] rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-green-400/20 z-10 rounded-xl"></div>
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
                  idx === currentImageIndex
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95"
                }`}
              >
                <Image
                  src={`/images/${img}`}
                  alt="Fitness"
                  fill
                  className="object-cover"
                  quality={85}
                  priority={idx === 0}
                />
              </div>
            ))}
            
            {/* Carousel Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? "bg-cyan-300 w-8"
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative py-20 px-4 md:px-8 max-w-7xl mx-auto scroll-mt-20"
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-cyan-200 text-lg">
            Everything you need to reach your goals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: faHeartPulse, title: "Health Tracking", desc: "Monitor vital signs & wellness metrics" },
            { icon: faDumbbell, title: "Smart Workouts", desc: "Customized routines & form guidance" },
            { icon: faFire, title: "Calorie Tracking", desc: "Real-time energy & nutrition monitoring" },
            { icon: faDroplet, title: "Hydration Plans", desc: "Smart water intake recommendations" },
            { icon: faLeaf, title: "Nutrition Plans", desc: "Macros, meals & personalized guidance" },
            { icon: faTrophy, title: "Achievement Goals", desc: "Track milestones & celebrate wins" },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="p-6 bg-cyan-900/40 border border-cyan-400/20 rounded-xl hover:border-cyan-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105 group"
            >
              <div className="mb-3 p-3 bg-cyan-500/20 border border-cyan-400/30 rounded-lg w-fit group-hover:bg-cyan-500/30 transition-all">
                <FontAwesomeIcon icon={feature.icon} className="text-xl text-cyan-300" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-cyan-200 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section className="relative py-20 px-4 md:px-8 max-w-7xl mx-auto mt-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold">
            How It{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { num: "1", title: "Sign Up" },
            { num: "2", title: "Set Goals" },
            { num: "3", title: "Get Plans" },
            { num: "4", title: "Track Progress" },
          ].map((step, idx) => (
            <div
              key={idx}
              className="p-6 bg-cyan-900/40 border border-cyan-400/20 rounded-lg text-center group hover:border-cyan-400/60 transition-all hover:scale-105"
            >
              <div className="text-4xl font-bold text-cyan-300 mb-3 group-hover:scale-110 transition-transform">
                {step.num}
              </div>
              <h3 className="font-bold text-lg">{step.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 px-4 md:px-8 max-w-7xl mx-auto mt-20">
        <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-400/20 rounded-2xl p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-12">
            Join Our Community
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6">
              <div className="text-5xl font-bold text-cyan-300 mb-2">100+</div>
              <p className="text-cyan-100">Exercises</p>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold text-teal-300 mb-2">50K+</div>
              <p className="text-cyan-100">Users</p>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold text-cyan-200 mb-2">99%</div>
              <p className="text-cyan-100">Success Rate</p>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold text-teal-200 mb-2">24/7</div>
              <p className="text-cyan-100">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 md:px-8 max-w-7xl mx-auto mt-20 text-center">
        <div className="bg-gradient-to-r from-cyan-500/80 to-teal-500/80 rounded-2xl p-12 md:p-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform?
          </h2>
          <p className="text-lg text-cyan-50 mb-8 max-w-2xl mx-auto">
            Start your fitness journey with AI-powered coaching today.
          </p>
          <button
            onClick={() => router.push("/register")}
            className="px-10 py-4 bg-white text-cyan-600 font-bold text-lg rounded-lg hover:bg-cyan-50 transition-all duration-300 hover:shadow-xl transform hover:scale-105"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 md:px-8 border-t border-cyan-400/20 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent mb-4">
                FitCoach AI
              </div>
              <p className="text-cyan-200 text-sm">
                AI-powered fitness coaching for everyone.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-cyan-100 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-cyan-200 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-cyan-100 mb-4">Legal</h4>
              <ul className="space-y-2 text-cyan-200 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-cyan-400/20 pt-8 text-center text-cyan-300 text-sm">
            <p>© 2026 FitCoach AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
