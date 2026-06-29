import { NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/anime/sections → all homepage rows in one round-trip.
export async function GET() {
  const p = getProvider();
  try {
    const [trending, popular, topRated, recentlyUpdated, upcoming, seasonal] =
      await Promise.all([
        p.getTrending(),
        p.getPopular(),
        p.getTopRated(),
        p.getRecentlyUpdated(),
        p.getUpcoming(),
        p.getSeasonal(),
      ]);
    return NextResponse.json({
      trending: trending.items,
      popular: popular.items,
      topRated: topRated.items,
      recentlyUpdated: recentlyUpdated.items,
      upcoming: upcoming.items,
      seasonal: seasonal.items,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load sections" },
      { status: 502 }
    );
  }
}
