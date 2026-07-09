import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.PYTHON_API_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const user_id = formData.get("user_id") as string | null;
    const meal_type = (formData.get("meal_type") as string) || "snack";
    const user_notes = formData.get("user_notes") as string | null;

    if (!file || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields: file and user_id" },
        { status: 400 }
      );
    }

    // Forward to Python backend
    const backendFormData = new FormData();
    backendFormData.append("file", file, file.name);
    backendFormData.append("user_id", user_id);
    backendFormData.append("meal_type", meal_type);
    if (user_notes) {
      backendFormData.append("user_notes", user_notes);
    }

    const backendResponse = await fetch(`${BACKEND}/api/nutrition/meals/analyze-image`, {
      method: "POST",
      body: backendFormData,
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Meal image analysis proxy error:", error);
    return NextResponse.json(
      { error: "Failed to analyze meal image", details: String(error) },
      { status: 500 }
    );
  }
}
