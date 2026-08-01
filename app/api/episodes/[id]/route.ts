import { NextRequest, NextResponse } from "next/server";

const STREAMING_BASE =
  (process.env.STREAMING_API_URL?.trim() ?? "https://bankai-s-api.onrender.com")
    .replace(/\/$/, "")
    .replace(/^(?!https?:\/\/)/, "https://");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`${STREAMING_BASE}/episodes/${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}.` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[episodes proxy] error:", err);
    return NextResponse.json(
      { error: "Failed to reach the streaming backend." },
      { status: 502 }
    );
  }
}
