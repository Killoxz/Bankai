import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/anime/:id/episodes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const episodes = await getProvider().getEpisodes(decodeURIComponent(id));
    return NextResponse.json(episodes);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load episodes" },
      { status: 502 }
    );
  }
}
