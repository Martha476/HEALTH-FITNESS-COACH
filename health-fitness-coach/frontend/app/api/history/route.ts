import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.PYTHON_API_URL}/api/history`, {
      method: "GET",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ messages: [] }, { status: 200 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");

    const response = await fetch(
      `${process.env.PYTHON_API_URL}/api/history/${messageId}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("History delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
