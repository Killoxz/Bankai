import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/providers";
import { parseAnimeQuery } from "@/lib/query-params";

// GET /api/anime?search=&genre=&sort=&page=  → browse/search (Trending page, infinite scroll)
export async function GET(req: NextRequest) {
  const q = parseAnimeQuery(req.nextUrl.searchParams);
  try {
    const data = await getProvider().search(q);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load anime" },
      { status: 502 }
    );
  }
}
