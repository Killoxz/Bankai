import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/search?q=... → instant search suggestions
export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) {
    return NextResponse.json({
      anime: [],
      characters: [],
      studios: [],
      staff: [],
      genres: [],
    });
  }
  try {
    const results = await getProvider().quickSearch(term);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 }
    );
  }
}
