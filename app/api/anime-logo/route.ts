import { NextRequest, NextResponse } from "next/server";

const WIKI_API = "https://commons.wikimedia.org/w/api.php";

interface WikiPage {
  missing?: string;
  imageinfo?: Array<{ url: string; thumburl?: string }>;
}

// Given a Wikimedia Commons filename, return a working image URL.
// Uses the real CDN path from the API response so there are no redirect or
// CORS issues — the client can use it directly as an <img src>.
async function wikiFileUrl(fileName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${WIKI_API}?action=query&titles=${encodeURIComponent(fileName)}` +
        `&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=600&format=json&origin=*`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;

    const data  = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const page  = Object.values(data.query?.pages ?? {})[0] as WikiPage | undefined;
    if (!page || "missing" in page) return null;

    const info = page.imageinfo?.[0];
    if (!info?.url) return null;

    // If Wikimedia already gave us a rendered thumb URL, use it directly.
    if (info.thumburl) return info.thumburl;

    // For SVG files the thumburl is often absent — construct the PNG CDN path manually.
    // Wikimedia thumbnail URL format:
    //   https://upload.wikimedia.org/wikipedia/commons/thumb/{a}/{ab}/{file}/{w}px-{file}.png
    // The direct URL already contains the /a/ab/ hash, so we just insert /thumb/ and append.
    if (info.url.toLowerCase().endsWith(".svg")) {
      const baseName = fileName.replace(/^File:/i, "");
      return (
        info.url.replace("/wikipedia/commons/", "/wikipedia/commons/thumb/") +
        `/600px-${baseName}.png`
      );
    }

    return info.url;
  } catch {
    return null;
  }
}

async function logoFromWikimedia(title: string): Promise<string | null> {
  // Build multiple slug variants to maximise hit rate across anime titles
  const us    = title.replace(/\s+/g, "_");
  const sp    = title.replace(/_/g, " ");
  // Strip colons, exclamation marks, apostrophes that may differ from the file name
  const clean = title.replace(/[:'!?]/g, "").trim().replace(/\s+/g, "_");
  // Short form: everything before the first ": " or " - " (sub-title strip)
  const short = us.replace(/_*[:\-].*$/, "");

  const directPatterns: string[] = [];
  for (const base of [...new Set([us, sp, clean, short])]) {
    directPatterns.push(
      `File:${base}_logo.svg`,
      `File:${base}_Logo.svg`,
      `File:${base}_logo.png`,
      `File:${base}_logo.PNG`,
      `File:${base}_logo.jpg`,
      `File:${base}_wordmark.svg`,
      `File:${base}_wordmark.png`,
      `File:${base}_title_logo.png`,
      `File:${base}_anime_logo.png`,
    );
  }

  for (const fileName of directPatterns) {
    const url = await wikiFileUrl(fileName);
    if (url) return url;
  }

  // Full-text search fallback in the File namespace
  for (const q of [`${title} logo`, `${title} anime logo`, `${clean} logo`]) {
    try {
      const res = await fetch(
        `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(q)}` +
          `&srnamespace=6&srlimit=10&format=json&origin=*`,
        { next: { revalidate: 86400 } },
      );
      if (!res.ok) continue;

      const { query } = (await res.json()) as {
        query?: { search?: Array<{ title: string }> };
      };
      const hits = (query?.search ?? []).filter(
        (r) =>
          /logo|wordmark/i.test(r.title) &&
          !/chapter|volume|episode|character|manga|infobox|template/i.test(r.title),
      );

      for (const hit of hits.slice(0, 5)) {
        const url = await wikiFileUrl(hit.title);
        if (url) return url;
      }
    } catch { continue; }
  }

  return null;
}

// Wikipedia page summary — the infobox image for many anime IS the official logo.
async function logoFromWikipedia(title: string): Promise<string | null> {
  // Try a few title variants to find the right Wikipedia article
  const variants = [
    title,
    title.replace(/[:\-].+$/, "").trim(),           // drop sub-title
    `${title} (anime)`,
    `${title} (manga)`,
  ];

  for (const v of variants) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(v)}`,
        { next: { revalidate: 86400 } },
      );
      if (!res.ok) continue;

      const data = (await res.json()) as {
        originalimage?: { source: string };
        thumbnail?: { source: string };
      };

      const src = data.originalimage?.source ?? data.thumbnail?.source;
      if (src) return src;
    } catch { continue; }
  }

  return null;
}

// TMDB — best quality logos, only works when TMDB_API_KEY is set.
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

  // Run all sources in parallel; prefer TMDB > Wikimedia > Wikipedia
  const [tmdb, wiki, wikipedia] = await Promise.all([
    logoFromTmdb(title),
    logoFromWikimedia(title),
    logoFromWikipedia(title),
  ]);

  return NextResponse.json({ logo: tmdb ?? wiki ?? wikipedia ?? null });
}
