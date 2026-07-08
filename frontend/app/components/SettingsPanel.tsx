"use client";

interface SettingsPanelProps {
  settings: {
    llm: string;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    personality: string;
    enableCache: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const handleChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* LLM Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">LLM Model</label>
        <select
          value={settings.llm}
          onChange={(e) => handleChange("llm", e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded text-white focus:outline-none focus:border-primary"
        >
          <option value="openai">OpenAI (GPT-4)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google (Gemini)</option>
        </select>
      </div>

      {/* Personality */}
      <div>
        <label className="block text-sm font-medium mb-2">Personality</label>
        <select
          value={settings.personality}
          onChange={(e) => handleChange("personality", e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded text-white focus:outline-none focus:border-primary"
        >
          <option value="friendly">Friendly & Motivational</option>
          <option value="formal">Formal & Professional</option>
          <option value="concise">Concise & Direct</option>
        </select>
      </div>

      {/* Temperature Slider */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Temperature: {settings.temperature.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => handleChange("temperature", parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Higher = more creative, Lower = more focused
        </p>
      </div>

      {/* Top P Slider */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Top P: {settings.topP.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.topP}
          onChange={(e) => handleChange("topP", parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Diversity in response tokens
        </p>
      </div>

      {/* Frequency Penalty Slider */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Frequency Penalty: {settings.frequencyPenalty.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.frequencyPenalty}
          onChange={(e) => handleChange("frequencyPenalty", parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Reduce repetitive phrases
        </p>
      </div>

      {/* Cache Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="cache"
          checked={settings.enableCache}
          onChange={(e) => handleChange("enableCache", e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="cache" className="ml-2 text-sm font-medium">
          Enable Response Caching
        </label>
      </div>

      {/* Info Section */}
      <div className="md:col-span-2 bg-primary/10 border border-primary/30 rounded p-4">
        <p className="text-sm text-gray-300">
          <strong>💡 Tip:</strong> Adjust these settings to customize how your fitness coach responds.
          Lower temperature for consistency, higher for variety. Use top-p for quality over diversity.
        </p>
      </div>
    </div>
  );
}
