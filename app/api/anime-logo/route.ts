import { NextRequest, NextResponse } from "next/server";

const WIKI_API = "https://commons.wikimedia.org/w/api.php";

interface WikiPage { missing?: string; imageinfo?: Array<{ url: string; thumburl?: string }> }

// Fetch the URL for a specific Wikimedia Commons file.
// For SVG files we request a 600px PNG thumbnail (more reliable as <img> src).
async function wikiFileUrl(fileName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${WIKI_API}?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=600&format=json&origin=*`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data  = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const pages = data.query?.pages ?? {};
    const page  = Object.values(pages)[0] as WikiPage | undefined;
    if (!page || "missing" in page) return null;
    const info = page.imageinfo?.[0];
    if (!info?.url) return null;
    // SVG → return the pre-rendered PNG thumbnail; PNG/WebP/JPG → direct URL
    return info.url.toLowerCase().endsWith(".svg") ? (info.thumburl ?? null) : info.url;
  } catch {
    return null;
  }
}

async function logoFromWikimedia(title: string): Promise<string | null> {
  // Build name variants: "Attack on Titan" → "Attack_on_Titan" and vice-versa
  const us = title.replace(/\s+/g, "_");       // underscored
  const sp = title.replace(/_/g, " ");          // spaced
  // Also a version without punctuation that might cause mismatches
  const clean = title.replace(/[:'!?]/g, "").replace(/\s+/g, "_");

  // Try the most common Wikimedia logo filename patterns first (no search round-trip)
  const directPatterns = [
    `File:${us}_logo.svg`,
    `File:${sp}_logo.svg`,
    `File:${clean}_logo.svg`,
    `File:${us}_Logo.svg`,
    `File:${us}_logo.png`,
    `File:${sp}_logo.png`,
    `File:${clean}_logo.png`,
    `File:${us}_logo.webp`,
    `File:${us}_wordmark.svg`,
    `File:${us}_wordmark.png`,
  ];

  for (const fileName of directPatterns) {
    const url = await wikiFileUrl(fileName);
    if (url) return url;
  }

  // Fallback: full-text search in File namespace
  const queries = [`${title} logo`, `${title} anime logo`];
  for (const q of queries) {
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
    } catch {
      continue;
    }
  }

  return null;
}

// TMDB fallback — only used when TMDB_API_KEY is set
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
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) return NextResponse.json({ logo: null });

  const [tmdb, wikimedia] = await Promise.all([
    logoFromTmdb(title),
    logoFromWikimedia(title),
  ]);

  return NextResponse.json({ logo: tmdb ?? wikimedia ?? null });
}
