import { NextResponse } from "next/server";

export const revalidate = 86400; // cache 24h per deployment

interface JikanEpisode {
  mal_id: number;
  filler: boolean;
}

interface JikanResponse {
  data?: JikanEpisode[];
  pagination?: { has_next_page?: boolean; last_visible_page?: number };
}

async function fetchJikanPage(malId: number, page: number): Promise<JikanResponse> {
  const res = await fetch(
    `https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return {};
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const malId = Number(searchParams.get("malId"));
  if (!malId || isNaN(malId)) {
    return NextResponse.json({ fillerSet: [] });
  }

  try {
    // Fetch page 1 first to learn how many pages there are
    const first = await fetchJikanPage(malId, 1);
    const totalPages = Math.min(first.pagination?.last_visible_page ?? 1, 20);

    const fillerSet: number[] = [];
    const collectFillers = (data: JikanEpisode[] | undefined) => {
      for (const ep of data ?? []) {
        if (ep.filler) fillerSet.push(ep.mal_id);
      }
    };

    collectFillers(first.data);

    if (totalPages > 1) {
      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const pages = await Promise.all(remaining.map((p) => fetchJikanPage(malId, p)));
      for (const page of pages) collectFillers(page.data);
    }

    return NextResponse.json({ fillerSet });
  } catch {
    return NextResponse.json({ fillerSet: [] });
  }
}
