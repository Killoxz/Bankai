import { NextRequest, NextResponse } from "next/server";

const ANILIST = "https://graphql.anilist.co";

const QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, search: $search, isAdult: false, sort: SEARCH_MATCH) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        format
        seasonYear
        status
      }
    }
  }
`;

export async function GET(req: NextRequest) {
  const q     = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "8", 10), 20);

  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(ANILIST, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { search: q, perPage: limit } }),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return NextResponse.json({ results: [] }, { status: 502 });

    const json = await res.json() as { data?: { Page?: { media?: unknown[] } } };
    return NextResponse.json({ results: json.data?.Page?.media ?? [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
