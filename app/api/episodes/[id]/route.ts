import { NextRequest, NextResponse } from "next/server";
import { fetchAnikotoEpisodesAsMap } from "@/lib/anikoto";

const ANIVEXA_BASE = process.env.STREAMING_API_URL?.trim().replace(/\/$/, "");
const ARM          = "https://arm.haglund.dev/api/v2/ids";

// The homepage now uses MAL IDs for anime cards.  When a watch link arrives
// with a MAL ID we need to resolve it to the AniList ID that Anivexa expects.
async function resolveToAnilistId(id: number): Promise<number> {
  try {
    // Fast path: id is already an AniList ID
    const byAnilist = await fetch(`${ARM}?source=anilist&id=${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    }).then(r => r.ok ? r.json() as Promise<Record<string, number | null>> : null).catch(() => null);

    if (byAnilist?.myanimelist) return id; // confirmed AniList ID

    // Slow path: treat id as MAL ID and look up canonical AniList ID
    const byMal = await fetch(`${ARM}?source=myanimelist&id=${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    }).then(r => r.ok ? r.json() as Promise<Record<string, number | null>> : null).catch(() => null);

    return byMal?.anilist ?? id;
  } catch { return id; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const inputId = parseInt(id, 10);

  if (!Number.isInteger(inputId) || inputId <= 0) {
    return NextResponse.json({ error: "Invalid anime ID." }, { status: 400 });
  }

  const anilistId = ANIVEXA_BASE ? await resolveToAnilistId(inputId) : inputId;

  // Try Anivexa-API first
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
