import { NextRequest, NextResponse } from "next/server";
import { fetchAnikotoEpisodesAsMap } from "@/lib/anikoto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anilistId = parseInt(id, 10);

  if (!Number.isInteger(anilistId) || anilistId <= 0) {
    return NextResponse.json({ error: "Invalid anime ID." }, { status: 400 });
  }

  try {
    const data = await fetchAnikotoEpisodesAsMap(anilistId);
    if (!data) {
      return NextResponse.json(
        { error: "Anime not found in streaming service." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[episodes] error:", err);
    return NextResponse.json(
      { error: "Failed to reach the streaming backend." },
      { status: 502 },
    );
  }
}
