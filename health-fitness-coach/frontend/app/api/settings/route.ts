import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SETTINGS = {
  llm: "openai",
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0,
  personality: "friendly",
  enableCache: true,
  enableTools: true,
  enabledTools: [],
  units: "kg/cm",
  notifications: true,
  theme: "dark",
  language: "en",
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS }, { status: 200 });
    }

    const response = await fetch(`${process.env.PYTHON_API_URL}/api/settings`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS }, { status: 200 });
    }

    const data = await response.json();

    // Normalize response shape — handle both { settings: {...} } and flat { llm: ... }
    const settings = data.settings ?? data;
    return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.json();

    if (!authHeader) {
      return NextResponse.json({ settings: body }, { status: 200 });
    }

    const response = await fetch(`${process.env.PYTHON_API_URL}/api/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Still return success with what was sent so UI stays in sync
      return NextResponse.json({ settings: body }, { status: 200 });
    }

    const data = await response.json();
    const settings = data.settings ?? data;
    return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}