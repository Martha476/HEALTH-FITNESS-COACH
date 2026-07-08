import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.PYTHON_API_URL ?? "http://localhost:8000";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delayMs = 1500
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err: unknown) {
      const isLast = attempt === retries - 1;
      const isConnRefused =
        err instanceof Error && err.message.includes("ECONNREFUSED");
      if (isLast || !isConnRefused) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("All retries failed");
}

export async function POST(request: NextRequest) {
  try {
    const { message, userProfile } = await request.json();
    const authHeader = request.headers.get("Authorization");

    const response = await fetchWithRetry(
      `${BACKEND}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader && { Authorization: authHeader }),
        },
        body: JSON.stringify({
          message,
          user_profile: userProfile,
          settings: {
            enabledAgents: ["nutrition_agent"],
            enabledTools: ["log_meal", "calculate_nutrition", "get_daily_nutrition"],
          },
          history: [],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Meals API error:", error);
    return NextResponse.json(
      { error: "Failed to log meal", response: "" },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const response = await fetchWithRetry(
      `${BACKEND}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader && { Authorization: authHeader }),
        },
        body: JSON.stringify({
          message: `Get my daily nutrition summary for user ${userId}`,
          user_profile: { id: userId },
          settings: {
            enabledAgents: ["nutrition_agent"],
            enabledTools: ["get_daily_nutrition"],
          },
          history: [],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get meals API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meals", response: "" },
      { status: 503 }
    );
  }
}