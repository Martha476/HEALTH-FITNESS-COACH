"use client";

import { useState } from "react";
import TopNavBar from "../components/TopNavBar";

export default function Help() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const FAQItem = ({
    question,
    answer,
    idx,
  }: {
    question: string;
    answer: string;
    idx: number;
  }) => (
    <div className="border border-slate-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center justify-between"
      >
        <span className="font-semibold text-slate-100 text-sm">{question}</span>
        <span
          className={`text-lg transition-transform ${
            expandedFAQ === idx ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>
      {expandedFAQ === idx && (
        <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-600">
          <p className="text-slate-300 text-xs leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <TopNavBar />
      <div className="min-h-[calc(100vh-4rem)] w-full py-6 px-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-slate-100">❓ Help & Guide</h1>
            <p className="text-slate-400 mt-2 text-base">
              Learn how to use your AI fitness coach
            </p>
          </div>

          {/* Hero Image Banner */}
          <div className="mb-6 rounded-2xl shadow-lg overflow-hidden animate-fade-in">
            <div className="overflow-hidden">
              <img 
                src="/images/Morning Mindfulness.jpg"
                alt="Health and Fitness"
                className="w-full h-40 md:h-48 object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="bg-slate-800 p-4">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                We're Here to Help 
              </h2>
              <p className="text-slate-300 text-sm">
                Get the most out of your AI fitness coach with these guides and tips
              </p>
            </div>
          </div>

          {/* Getting Started */}
          {/* Getting Started - Improved with better visibility */}
{/* Getting Started - Improved with better text visibility */}
<div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-2xl p-6 mb-6 shadow-lg shadow-green-900/20">
  <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-3">
    <span className="text-3xl"></span> 
    <span className="bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">Getting Started</span>
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[
      { step: "1", icon: "👤", desc: "Add your fitness goals, age, weight, and activity level", highlight: "Profile", color: "blue" },
      { step: "2", icon: "💬", desc: "Ask for personalized advice and get instant feedback", highlight: "AI Coach", color: "purple" },
      { step: "3", icon: "🏋️", desc: "Create custom exercise plans tailored to your goals", highlight: "Workouts", color: "orange" },
      { step: "4", icon: "📊", desc: "Monitor your fitness journey with detailed analytics", highlight: "Progress", color: "pink" },
    ].map((item, idx) => (
      <div key={idx} className="bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/70 transition-all duration-300 hover:scale-[1.02] hover:border-green-500/50 group">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-green-500/30">
            {item.step}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs leading-relaxed">
              {item.desc.replace(item.highlight, '')}
              <span className={`text-${item.color}-400 font-semibold bg-${item.color}-900/30 px-2 py-0.5 rounded-full text-[10px] ml-1 border border-${item.color}-500/30`}>
                {item.highlight}
              </span>
            </p>
          </div>
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

          {/* Feature Explanations */}
          <div className="bg-slate-800 rounded-2xl shadow-lg p-5 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">
               Feature Guide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  emoji: "💬",
                  title: "AI Coach Chat",
                  description:
                    "Ask your AI fitness coach anything about workouts, nutrition, and fitness. Get personalized advice based on your profile.",
                  tips: [
                    "Be specific about your goals",
                    "Ask follow-up questions",
                    "Share your constraints (time, equipment)",
                  ],
                },
                {
                  emoji: "🏋️",
                  title: "Workout Planner",
                  description:
                    "Generate custom workout plans based on your fitness level, available time, and goals.",
                  tips: [
                    "Start with your fitness level",
                    "Adjust duration as needed",
                    "Track completed exercises",
                  ],
                },
                {
                  emoji: "🥗",
                  title: "Nutrition Tracker",
                  description:
                    "Log your meals and track daily macronutrients. Get meal suggestions from your AI coach.",
                  tips: [
                    "Log meals immediately after eating",
                    "Check macro distribution daily",
                    "Ask coach for recipes",
                  ],
                },
                {
                  emoji: "📊",
                  title: "Progress Tracking",
                  description:
                    "Monitor your fitness improvements over time with charts and statistics.",
                  tips: [
                    "Update weight weekly",
                    "Log personal records",
                    "Review trends monthly",
                  ],
                },
              ].map((feature, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700/70 transition-colors">
                  <div className="text-3xl mb-2">{feature.emoji}</div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300 text-sm mb-3">{feature.description}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">💡 Tips:</p>
                    <ul className="text-xs text-slate-400 space-y-0.5">
                      {feature.tips.map((tip, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="text-green-400">✓</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Example Prompts */}
          <div className="bg-slate-800 rounded-2xl shadow-lg p-5 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">
              💬 Example Prompts
            </h2>
            <div className="space-y-3">
              {[
                {
                  category: "Workouts",
                  prompts: [
                    "Create a 4-day upper/lower split for muscle building",
                    "Generate a 30-minute home workout with no equipment",
                    "I want to improve my running endurance, what's a good plan?",
                  ],
                },
                {
                  category: "Nutrition",
                  prompts: [
                    "Calculate my macros for weight loss",
                    "Suggest high-protein breakfast ideas",
                    "Create a meal plan for the week that hits my macro targets",
                  ],
                },
                {
                  category: "Progress & Goals",
                  prompts: [
                    "How can I break through my bench press plateau?",
                    "I gained 5 lbs in a month, is that good?",
                    "Should I do cardio or focus on strength training?",
                  ],
                },
              ].map((section, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-100 mb-2 text-sm">{section.category}</h4>
                  <ul className="space-y-1">
                    {section.prompts.map((prompt, i) => (
                      <li key={i} className="text-slate-300 text-xs">
                        <span className="text-green-400 mr-1">"</span>
                        {prompt}
                        <span className="text-green-400 ml-1">"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-slate-800 rounded-2xl shadow-lg p-5 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">
              ❓ Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              <FAQItem
                idx={0}
                question="How does the AI coach personalize recommendations?"
                answer="The AI coach uses your profile information (age, weight, fitness level, goals) along with your conversation history to provide personalized advice. Update your profile regularly for better recommendations."
              />
              <FAQItem
                idx={1}
                question="Can I adjust the AI personality?"
                answer="Yes! Go to Settings and choose between Friendly (motivational), Formal (professional), or Concise (direct) personalities. You can also adjust the temperature and creativity of responses."
              />
              <FAQItem
                idx={2}
                question="What does the Temperature setting do?"
                answer="Temperature controls how creative or focused the AI is. Lower values (0.0-0.5) make responses more consistent and focused, while higher values (1.5-2.0) make them more creative and varied."
              />
              <FAQItem
                idx={3}
                question="How accurate are the calorie calculations?"
                answer="The calorie estimates are approximate and meant as guidelines. Actual calorie burn varies based on individual factors like metabolism, intensity, and fitness level. Use these as starting points and adjust based on results."
              />
              <FAQItem
                idx={4}
                question="Can I export my progress data?"
                answer="Currently, you can view all your progress in the Progress section. Export functionality is coming soon. You can take screenshots or use your browser's print function to save charts."
              />
              <FAQItem
                idx={5}
                question="How often should I update my weight and metrics?"
                answer="Update your weight weekly for the most accurate progress tracking. Weigh yourself at the same time each day (ideally morning before eating) for consistency."
              />
              <FAQItem
                idx={6}
                question="What if the coach gives conflicting advice?"
                answer="The AI provides general fitness guidance. Always consult with healthcare professionals for medical concerns. If you get replies that don't make sense, try rephrasing your question or provide more context."
              />
              <FAQItem
                idx={7}
                question="Is my data private and secure?"
                answer="Yes, your profile and conversation data are stored securely. Your API keys are never displayed or logged. Never share your API keys or personal health information with untrusted sources."
              />
            </div>
          </div>

          {/* Tips & Tricks */}
          <div className="bg-gradient-to-r from-teal-900/40 to-cyan-900/40 rounded-2xl p-5 border border-green-700 mb-6">
            <h2 className="text-xl font-bold text-teal-300 mb-3">
              ⭐ Tips & Tricks
            </h2>
            <div className="space-y-2 text-teal-200 text-sm">
              <p>
                <strong>🎯 Be Specific:</strong> Instead of "What should I eat?" try
                "I have 30 minutes and want a high-protein meal under 500 calories."
              </p>
              <p>
                <strong>📈 Track Consistently:</strong> Regular updates help the AI
                understand what works for you and provide better recommendations.
              </p>
              <p>
                <strong>💬 Use Conversation:</strong> Ask follow-up questions to get
                more detailed explanations and personalized variations.
              </p>
            </div>
          </div>

          {/* Contact & Support */}
          <div className="text-center p-5 bg-slate-800 rounded-2xl border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Need More Help?
            </h3>
            <p className="text-slate-400 text-sm mb-3">
              Can't find what you're looking for? Reach out to our support team.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => window.open('https://github.com', '_blank')}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                📖 Documentation
              </button>
              <button 
                onClick={() => window.location.href = 'mailto:support@fitcoach.ai'}
                className="bg-slate-600 text-slate-100 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-500 transition-colors"
              >
                📧 Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}