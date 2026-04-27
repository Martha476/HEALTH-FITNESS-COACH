import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/api/auth/send-verification-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Send verification email proxy error:", error);
    return NextResponse.json(
      { detail: "Unable to connect to authentication server" },
      { status: 502 }
    );
  }
}
