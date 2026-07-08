const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet",
  google: "gemini-1.5-pro",
};

const MODEL_COSTS: Record<string, { label: string; input: number; output: number }> = {
  "gpt-4o": { label: "GPT-4o", input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { label: "GPT-4o Mini", input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { label: "GPT-4 Turbo", input: 0.01, output: 0.03 },
  "claude-3-5-sonnet": { label: "Claude 3.5 Sonnet", input: 0.003, output: 0.015 },
  "claude-3-opus": { label: "Claude 3 Opus", input: 0.015, output: 0.075 },
  "gemini-1.5-pro": { label: "Gemini 1.5 Pro", input: 0.00125, output: 0.005 },
  "gemini-1.5-flash": { label: "Gemini 1.5 Flash", input: 0.000075, output: 0.0003 },
};

export type TokenUsageEntry = {
  model: string;
  date: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
};

export type TokenStats = {
  totalTokens: number;
  totalCost: number;
  totalMessages: number;
  history: TokenUsageEntry[];
  byModel: Record<string, { tokens: number; cost: number; messages: number }>;
};

function storageKey(userId: string) {
  return `token_stats_${userId}`;
}

function emptyStats(): TokenStats {
  return { totalTokens: 0, totalCost: 0, totalMessages: 0, history: [], byModel: {} };
}

function resolveModelKey(llmOrModel: string): string {
  if (MODEL_COSTS[llmOrModel]) return llmOrModel;
  return PROVIDER_DEFAULT_MODEL[llmOrModel] ?? "gpt-4o";
}

export function getAllModelCosts() {
  return MODEL_COSTS;
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const key = resolveModelKey(model);
  const rates = MODEL_COSTS[key] ?? MODEL_COSTS["gpt-4o"];
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
}

export function loadTokenStatsFromStorage(userId: string): TokenStats {
  if (typeof window === "undefined") return emptyStats();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as TokenStats;
    return { ...emptyStats(), ...parsed, history: parsed.history ?? [], byModel: parsed.byModel ?? {} };
  } catch {
    return emptyStats();
  }
}

function saveTokenStats(userId: string, stats: TokenStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(stats));
}

export function recordTokenUsage(
  userId: string,
  llmOrModel: string,
  promptTokens: number,
  completionTokens: number
) {
  const model = resolveModelKey(llmOrModel);
  const cost = calculateCost(model, promptTokens, completionTokens);
  const total = promptTokens + completionTokens;
  const stats = loadTokenStatsFromStorage(userId);

  const entry: TokenUsageEntry = {
    model,
    date: new Date().toISOString(),
    promptTokens,
    completionTokens,
    cost,
  };

  stats.history = [entry, ...stats.history].slice(0, 100);
  stats.totalTokens += total;
  stats.totalCost += cost;
  stats.totalMessages += 1;

  if (!stats.byModel[model]) {
    stats.byModel[model] = { tokens: 0, cost: 0, messages: 0 };
  }
  stats.byModel[model].tokens += total;
  stats.byModel[model].cost += cost;
  stats.byModel[model].messages += 1;

  saveTokenStats(userId, stats);

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (token) {
    fetch(`${API_URL}/api/token-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: total,
        cost,
      }),
    }).catch(() => {});
  }
}

export async function fetchTokenStatsFromBackend(
  authToken: string
): Promise<TokenStats | null> {
  try {
    const res = await fetch(`${API_URL}/api/token-usage`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.totalTokens === "number") {
      return {
        totalTokens: data.totalTokens ?? 0,
        totalCost: data.totalCost ?? 0,
        totalMessages: data.totalMessages ?? 0,
        history: data.history ?? [],
        byModel: data.byModel ?? {},
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearTokenHistory(userId: string, authToken?: string | null) {
  saveTokenStats(userId, emptyStats());
  if (authToken) {
    fetch(`${API_URL}/api/token-usage`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => {});
  }
}
