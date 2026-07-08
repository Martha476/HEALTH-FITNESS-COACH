"use client";

interface StatsDisplayProps {
  tokens: number;
  cost: number;
  messagesCount: number;
}

export default function StatsDisplay({
  tokens,
  cost,
  messagesCount,
}: StatsDisplayProps) {
  return (
    <div className="bg-slate-800/50 border border-secondary/20 rounded-lg p-4 space-y-3">
      <h4 className="font-semibold text-secondary mb-3">Usage Stats</h4>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Tokens Used</span>
        <span className="text-white font-semibold">{tokens.toLocaleString()}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Est. Cost</span>
        <span className="text-white font-semibold">${cost.toFixed(4)}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Messages</span>
        <span className="text-white font-semibold">{messagesCount}</span>
      </div>

      <div className="pt-2 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          💰 Tokens tracked in real-time for cost optimization
        </p>
      </div>
    </div>
  );
}
