import { NextRequest, NextResponse } from "next/server";

const WIKI_API = "https://commons.wikimedia.org/w/api.php";

// Check if a Wikimedia Commons file exists; if so return a Special:FilePath URL.
// Special:FilePath lets the browser follow the redirect to the actual file / PNG
// thumbnail — avoids the thumburl API call that silently returns null for many SVGs.
async function wikiFileUrl(fileName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${WIKI_API}?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json&origin=*`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data  = (await res.json()) as { query?: { pages?: Record<string, { missing?: string }> } };
    const pages = data.query?.pages ?? {};
    const page  = Object.values(pages)[0];
    if (!page || "missing" in page) return null;

    // File confirmed to exist — use Special:FilePath so the browser gets the image
    // via redirect (works for both SVG and PNG, no thumburl dependency).
    const name = fileName.replace(/^File:/i, "").replace(/\s+/g, "_");
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=600`;
  } catch {
    return null;
  }
}

async function logoFromWikimedia(title: string): Promise<string | null> {
  const us    = title.replace(/\s+/g, "_");
  const sp    = title.replace(/_/g, " ");
  const clean = title.replace(/[:'!?]/g, "").replace(/\s+/g, "_");

  // Try common filename patterns first (no search round-trip needed)
  const directPatterns = [
    `File:${us}_logo.svg`,
    `File:${sp}_logo.svg`,
    `File:${clean}_logo.svg`,
    `File:${us}_Logo.svg`,
    `File:${us}_logo.png`,
    `File:${sp}_logo.png`,
    `File:${clean}_logo.png`,
    `File:${us}_wordmark.svg`,
    `File:${us}_wordmark.png`,
    `File:${clean}_wordmark.svg`,
  ];

  for (const fileName of directPatterns) {
    const url = await wikiFileUrl(fileName);
    if (url) return url;
  }

  // Search fallback
  for (const q of [`${title} logo`, `${title} anime logo`]) {
    try {
      const res = await fetch(
        `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=10&format=json&origin=*`,
        { next: { revalidate: 86400 } },
      );
      if (!res.ok) continue;
      const { query } = (await res.json()) as { query?: { search?: Array<{ title: string }> } };
      const hits = (query?.search ?? []).filter(
        (r) => /logo|wordmark/i.test(r.title) && !/chapter|volume|episode|character|manga|infobox/i.test(r.title),
      );
      for (const hit of hits.slice(0, 4)) {
        const url = await wikiFileUrl(hit.title);
        if (url) return url;
      }
    } catch { continue; }
  }

  return null;
}

async function logoFromTmdb(title: string): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const sr = await fetch(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&api_key=${key}&language=en-US`,
      { next: { revalidate: 86400 } },
    );
    if (!sr.ok) return null;
    const { results } = (await sr.json()) as { results?: Array<{ id: number }> };
    const tvId = results?.[0]?.id;
    if (!tvId) return null;

    const ir = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}/images?include_image_language=en,null&api_key=${key}`,
      { next: { revalidate: 86400 } },
    );
    if (!ir.ok) return null;
    const { logos } = (await ir.json()) as {
      logos?: Array<{ file_path: string; iso_639_1: string | null; vote_average: number }>;
    };
    if (!logos?.length) return null;
    const pick =
      logos.find((l) => l.iso_639_1 === "en") ??
      logos.sort((a, b) => b.vote_average - a.vote_average)[0];
    return `https://image.tmdb.org/t/p/original${pick.file_path}`;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) return NextResponse.json({ logo: null });

  const [tmdb, wiki] = await Promise.all([logoFromTmdb(title), logoFromWikimedia(title)]);
  return NextResponse.json({ logo: tmdb ?? wiki ?? null });
}
