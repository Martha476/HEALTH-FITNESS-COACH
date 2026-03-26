"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { recordTokenUsage } from "../../lib/tokenTracking";
import MessageFeedback from "../components/MessageFeedback";
import WeatherRecommendations from "../components/WeatherRecommendations";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Settings {
  llm: string;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  personality: string;
  enableCache: boolean;
  enabledTools?: string[];
}

const DEFAULT_SETTINGS: Settings = {
  llm: "openai",
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0,
  personality: "friendly",
  enableCache: true,
  enabledTools: [
    "generate_workout_plan",
    "calculate_nutrition",
    "analyze_progress",
    "search_exercises",
    "track_goals",
  ],
};

export default function AiCoach() {
  const { user, getUserKey } = useAuth();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [inputValue, setInputValue]   = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_URL   = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const COACH_IMG = "/images/ai-coach-cartoon.jpg";

  const suggestedPrompts = [
    "Create a weekly workout plan for muscle building",
    "Suggest a healthy breakfast for weight loss",
    "How can I improve my fitness routine?",
    "Calculate macros for my weight loss goal",
  ];

  // Reload profile whenever logged-in user changes
  useEffect(() => {
    if (!user) return;
    loadUserProfile();
  }, [user?.id]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem("fitcoach_token");
      if (token && user) {
        try {
          const res = await axios.get(
            `${API_URL}/api/profile/${user.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUserProfile({ ...user, ...res.data });
        } catch {
          // Fall back to user-scoped localStorage
          const scopedKey = getUserKey("userProfile");
          const scoped    = localStorage.getItem(scopedKey);
          const shared    = localStorage.getItem("userProfile");
          const saved     = scoped || shared;
          setUserProfile({ ...user, ...(saved ? JSON.parse(saved) : {}) });
        }
      } else {
        const scopedKey = getUserKey("userProfile");
        const saved     = localStorage.getItem(scopedKey) ||
                          localStorage.getItem("userProfile");
        if (saved) setUserProfile({ ...user, ...JSON.parse(saved) });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setProfileLoaded(true);
    }
  };

  // Always read LATEST settings from localStorage before sending
  // Settings page controls these — ai-coach just reads them silently
  const getLatestSettings = (): Settings => {
    try {
      const saved = localStorage.getItem("aiCoachSettings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SETTINGS;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageToSend = inputValue;
    const userMsg: Message = {
      id:        Date.now().toString(),
      role:      "user",
      content:   messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const p = userProfile || {};
      const builtProfile = {
        id:                    p.id    || user?.id    || "default",
        name:                  p.name  || user?.name  || "User",
        age:                   p.age   || 30,
        gender:                p.gender || "other",
        weight_lbs:            p.weight_lbs  || p.currentWeight   || 150,
        height:                p.height      || "5'10",
        target_weight:         p.target_weight  || p.targetWeight  || 0,
        fitness_level:         p.fitness_level  || p.experienceLevel || "intermediate",
        primary_goal:          p.primary_goal   || p.primaryGoal   || "general fitness",
        activity_level:        p.activity_level || p.activityLevel || "moderate",
        dietary_type:          p.dietary_type   || p.dietaryType   || "no-restriction",
        food_allergies:        p.food_allergies || p.foodAllergies || "",
        meals_per_day:         p.meals_per_day  || p.mealsPerDay   || 3,
        daily_calorie_goal:    p.daily_calorie_goal || p.dailyCalorieGoal || 0,
        preferred_workout:     p.preferred_workout  || p.preferredWorkoutType || "mixed",
        equipment_available:   p.equipment_available || p.availableEquipment  || "none",
        workout_days_per_week: p.workout_days_per_week || p.workoutDaysPerWeek || 3,
        workout_duration:      p.workout_duration || p.workoutDuration || "45min",
        injuries:              p.injuries || "",
        medical_conditions:    p.medical_conditions || p.medicalConditions || "",
      };

      // Silently read latest settings — no UI display needed
      const currentSettings = getLatestSettings();

      const token = localStorage.getItem("fitcoach_token");
      const res   = await axios.post(
        `${API_URL}/api/chat`,
        {
          message:      messageToSend,
          settings:     currentSettings,
          user_profile: builtProfile,
          history:      messages.map((m) => ({
            role: m.role, content: m.content,
          })),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setMessages((prev) => [
        ...prev,
        {
          id:        (Date.now() + 1).toString(),
          role:      "assistant",
          content:   res.data.response || "I'm here to help with your fitness goals!",
          timestamp: new Date(),
        },
      ]);

      // Record token usage
      if (res.data.tokenUsage && user) {
        const { prompt: promptTokens = 0, completion: completionTokens = 0, total: totalTokens = 0 } = res.data.tokenUsage;
        const settings = getLatestSettings();
        recordTokenUsage(user.id, settings.llm, promptTokens, completionTokens);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id:        (Date.now() + 2).toString(),
          role:      "assistant",
          content:   "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const profileName     = userProfile?.name || user?.name;
  const profileGoal     = userProfile?.primary_goal || userProfile?.primaryGoal;
  const profileComplete = !!(userProfile?.age && (userProfile?.fitness_level || userProfile?.experienceLevel));

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col items-center py-6 px-4 sm:px-6">
      <div className="w-full max-w-2xl flex flex-col" style={{ minHeight: "calc(100vh - 8rem)" }}>

        {/* ── Header — clean, no settings details ─────── */}
        <div className="mb-4 flex items-center gap-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-green-500 shrink-0 bg-slate-700">
            <img
              src={COACH_IMG}
              alt="AI Coach"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
              AI Fitness Coach
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Ask me anything about fitness, workouts, and nutrition
            </p>
            {profileLoaded && (
              <p className="text-sm mt-0.5">
                {profileName ? (
                  <span className="text-green-400">
                    Personalised for {profileName}
                  </span>
                ) : (
                  <span className="text-yellow-400">
                    Complete your profile for personalised advice
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* ── Chat Area ────────────────────────────────── */}
        <div className="flex-1 bg-slate-800 rounded-xl overflow-y-auto mb-3 p-4 border border-slate-700">
          {messages.length === 0 ? (
            /* Welcome screen — clean, no model/tone/temp badges */
            <div className="h-full flex flex-col items-center justify-center text-center py-6">
              <div className="w-28 h-28 sm:w-36 sm:h-36 mb-4 rounded-2xl overflow-hidden border-4 border-green-500 bg-slate-700">
                <img
                  src={COACH_IMG}
                  alt="AI Assistant"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=300&fit=crop";
                  }}
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
                {profileName
                  ? `Welcome back, ${profileName}!`
                  : "Welcome to Your AI Coach!"}
              </h2>

              <p className="text-slate-400 max-w-sm text-base leading-relaxed">
                {profileGoal
                  ? `I know your goal is to ${profileGoal}. Let's work on it!`
                  : "I'm here to help you achieve your fitness goals."}
              </p>

              {/* Profile status — only show if profile is incomplete */}
              {!profileComplete && (
                <div className="mt-5 bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-4 py-3 max-w-sm w-full">
                  <p className="text-sm text-yellow-300">
                    Complete your profile for personalised coaching!{" "}
                    <a href="/profile" className="underline text-yellow-200 hover:text-white">
                      Go to Profile →
                    </a>
                  </p>
                </div>
              )}

              {profileComplete && (
                <div className="mt-5 bg-green-900/30 border border-green-500/30 rounded-xl px-4 py-3 max-w-sm w-full">
                  <p className="text-sm text-green-300">
                    Profile loaded — I know your goals and will give personalised advice.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Messages */
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col">
                    <div
                      className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-xl text-base leading-relaxed ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-br-none"
                          : "bg-slate-700 text-slate-100 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-xs opacity-60 mt-1 block">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {msg.role === "assistant" && (
                      <div>
                        <MessageFeedback messageId={msg.id} userId={user?.id || "default"} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 px-4 py-3 rounded-xl rounded-bl-none">
                    <div className="flex gap-1.5">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce block"
                          style={{ animationDelay: `${d}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Suggested Prompts ────────────────────────── */}
        {messages.length === 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-2 text-center font-medium">
              Try asking:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt)}
                  className="text-left px-3 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-green-500 transition-colors text-sm text-slate-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Weather-Based Recommendations ──────────── */}
        <div className="mb-3">
          <WeatherRecommendations />
        </div>

        {/* ── Input Area — no settings info shown ─────── */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask your fitness coach..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base disabled:opacity-60"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="shrink-0 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}