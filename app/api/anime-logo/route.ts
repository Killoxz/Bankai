import { NextRequest, NextResponse } from "next/server";

const WIKI_API = "https://commons.wikimedia.org/w/api.php";

interface WikiPage {
  missing?: string;
  imageinfo?: Array<{ url: string; thumburl?: string }>;
}

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
    if (info.thumburl) return info.thumburl;
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
  const us    = title.replace(/\s+/g, "_");
  const sp    = title.replace(/_/g, " ");
  const clean = title.replace(/[:'!?]/g, "").trim().replace(/\s+/g, "_");
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
      `File:${base}_title.png`,
      `File:${base}_title.svg`,
    );
  }

  for (const fileName of directPatterns) {
    const url = await wikiFileUrl(fileName);
    if (url) return url;
  }

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
          /logo|wordmark|title/i.test(r.title) &&
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

async function logoFromWikipedia(title: string): Promise<string | null> {
  const variants = [
    title,
    title.replace(/[:\-].+$/, "").trim(),
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

// Fanart.tv — best source for HD anime/TV title logos (transparent PNG).
// Requires FANART_TV_API_KEY and the TVDB series ID for the show.
async function logoFromFanart(tvdbId: string): Promise<string | null> {
  const key = process.env.FANART_TV_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://webservice.fanart.tv/v3/tv/${tvdbId}?api_key=${key}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      hdtvlogo?: Array<{ url: string; lang: string }>;
      tvlogo?:   Array<{ url: string; lang: string }>;
    };
    const logos = [...(data.hdtvlogo ?? []), ...(data.tvlogo ?? [])];
    if (!logos.length) return null;
    const pick = logos.find((l) => l.lang === "en") ?? logos[0];
    return pick?.url ?? null;
  } catch {
    return null;
  }
}

// Ask AniList for external links to extract the TVDB series ID.
async function tvdbIdFromAnilist(animeId: number): Promise<string | null> {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        query: `{ Media(id: ${animeId}) { externalLinks { site siteId url } } }`,
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { externalLinks?: Array<{ site: string; siteId?: number; url: string }> } };
    };
    const links = json.data?.Media?.externalLinks ?? [];
    const tvdb  = links.find(
      (l) => l.site?.toLowerCase().includes("tvdb") || l.url?.includes("thetvdb.com"),
    );
    if (!tvdb) return null;
    // Use the siteId (numeric) if AniList stored it, else extract from URL.
    if (tvdb.siteId) return String(tvdb.siteId);
    const match = tvdb.url.match(/\/(\d+)(?:\/|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const title   = req.nextUrl.searchParams.get("title");
  const animeIdParam = req.nextUrl.searchParams.get("animeId");
  if (!title) return NextResponse.json({ logo: null });

  const animeId = animeIdParam ? parseInt(animeIdParam, 10) : null;

  // Try Fanart.tv first (best quality transparent logos) — needs TVDB ID + API key.
  let fanart: string | null = null;
  if (animeId && !isNaN(animeId) && process.env.FANART_TV_API_KEY) {
    const tvdbId = await tvdbIdFromAnilist(animeId);
    if (tvdbId) fanart = await logoFromFanart(tvdbId);
  }
  if (fanart) return NextResponse.json({ logo: fanart });

  // Parallel fallback: Wikimedia Commons SVG/PNG + Wikipedia page image.
  const [wiki, wikipedia] = await Promise.all([
    logoFromWikimedia(title),
    logoFromWikipedia(title),
  ]);

  return NextResponse.json({ logo: wiki ?? wikipedia ?? null });
}
