import { NextRequest, NextResponse } from "next/server";
import { fetchAnikotoEpisodesAsMap } from "@/lib/anikoto";

const ANIVEXA_BASE = process.env.STREAMING_API_URL?.trim().replace(/\/$/, "");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anilistId = parseInt(id, 10);

  if (!Number.isInteger(anilistId) || anilistId <= 0) {
    return NextResponse.json({ error: "Invalid anime ID." }, { status: 400 });
  }

  // Try Anivexa-API first when deployed
  if (ANIVEXA_BASE) {
    try {
      const res = await fetch(`${ANIVEXA_BASE}/episodes/${anilistId}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.ok) return NextResponse.json(await res.json());
    } catch {}
  }

  // Fall back to direct Anikoto
  try {
    const data = await fetchAnikotoEpisodesAsMap(anilistId);
    if (!data) return NextResponse.json({ error: "Anime not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[episodes] error:", err);
    return NextResponse.json({ error: "Failed to reach the streaming backend." }, { status: 502 });
  }
}
