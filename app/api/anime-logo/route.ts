import { NextRequest, NextResponse } from "next/server";

interface WikiSearch { title: string }
interface WikiPage   { imageinfo?: { url: string }[] }

// Search Wikimedia Commons for the anime's official logo (SVG/PNG, transparent bg).
// Free, no API key needed. Commons has proper logos for almost every major anime.
async function logoFromWikimedia(title: string): Promise<string | null> {
  // Try two query variants — prefer hits with "logo" in the file name
  const queries = [
    `${title} logo`,
    `${title} anime logo`,
  ];

  for (const q of queries) {
    try {
      const searchRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=10&format=json&origin=*`,
        { next: { revalidate: 86400 } },
      );
      if (!searchRes.ok) continue;

      const { query } = (await searchRes.json()) as { query?: { search?: WikiSearch[] } };
      const results = (query?.search ?? []).filter((r) =>
        /logo/i.test(r.title) && !/chapter|volume|episode|character|manga/i.test(r.title),
      );
      if (!results.length) continue;

      // Prefer SVG; otherwise take first result
      const pick =
        results.find((r) => r.title.toLowerCase().endsWith(".svg")) ??
        results.find((r) => /\.(png|svg|webp)$/i.test(r.title)) ??
        results[0];

      const fileRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(pick.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`,
        { next: { revalidate: 86400 } },
      );
      if (!fileRes.ok) continue;

      const fileData = (await fileRes.json()) as { query?: { pages?: Record<string, WikiPage> } };
      const pages = fileData.query?.pages ?? {};
      const url   = (Object.values(pages)[0] as WikiPage)?.imageinfo?.[0]?.url;
      if (url) return url;
    } catch {
      continue;
    }
  }
  return null;
}

// TMDB fallback — only runs when TMDB_API_KEY is configured.
async function logoFromTmdb(title: string): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  try {
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&api_key=${key}&language=en-US`,
      { next: { revalidate: 86400 } },
    );
    if (!searchRes.ok) return null;

    const { results } = (await searchRes.json()) as { results?: { id: number }[] };
    const tvId = results?.[0]?.id;
    if (!tvId) return null;

    const imgRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}/images?include_image_language=en,null&api_key=${key}`,
      { next: { revalidate: 86400 } },
    );
    if (!imgRes.ok) return null;

    const { logos } = (await imgRes.json()) as {
      logos?: { file_path: string; iso_639_1: string | null; vote_average: number }[];
    };
    if (!logos?.length) return null;

    const pick =
      logos.find((l) => l.iso_639_1 === "en") ??
      logos.sort((a, b) => b.vote_average - a.vote_average)[0];

    return `https://image.tmdb.org/t/p/original${pick.file_path}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) return NextResponse.json({ logo: null });

  // Run both sources in parallel — take whichever resolves first with a result
  const [wikimedia, tmdb] = await Promise.all([
    logoFromWikimedia(title),
    logoFromTmdb(title),
  ]);

  // Prefer TMDB (curated, high quality) then Wikimedia (keyless, very broad coverage)
  const logo = tmdb ?? wikimedia ?? null;
  return NextResponse.json({ logo });
}
