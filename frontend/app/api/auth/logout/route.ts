import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ detail: "No token provided" }, { status: 401 });
    }
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Logout proxy error:", error);
    return NextResponse.json(
      { detail: "Unable to connect to authentication server" },
      { status: 502 }
    );
  }
}
