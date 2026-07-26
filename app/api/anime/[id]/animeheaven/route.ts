import { NextRequest, NextResponse } from "next/server";

const BASE = "https://animeheaven.me";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE}/`,
};

export interface AnimeHeavenStream {
  url: string;
  isM3U8: false;
}

// GET /api/anime/:id/animeheaven?ep=1&title=Kimetsu+no+Yaiba&titleAlt=Demon+Slayer
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;

  const ep = parseInt(req.nextUrl.searchParams.get("ep") ?? "1", 10);
  const title = req.nextUrl.searchParams.get("title") ?? "";
  const titleAlt = req.nextUrl.searchParams.get("titleAlt") ?? "";

  if (!title || ep < 1) {
    return NextResponse.json({ error: "title and ep required" }, { status: 400 });
  }

  try {
    const animeId = await findAnimeId(title, titleAlt);
    if (!animeId) {
      return NextResponse.json({ error: "Not found on AnimeHeaven" }, { status: 404 });
    }

    const episodes = await getEpisodes(animeId);
    const episode = episodes.find((e) => e.num === ep);
    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const mp4 = await getStream(episode.id, animeId);
    if (!mp4) {
      return NextResponse.json({ error: "No stream URL returned" }, { status: 404 });
    }

    return NextResponse.json(
      { url: mp4, isM3U8: false } satisfies AnimeHeavenStream,
      { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600" } }
    );
  } catch (err) {
    console.error("[AnimeHeaven]", err);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}

// ── Title scoring ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleScore(query: string, candidate: string): number {
  const n = norm(query);
  const h = norm(candidate);
  if (h === n) return 100;
  if (h.startsWith(n) || n.startsWith(h)) return 80;
  if (h.includes(n) || n.includes(h)) return 60;
  let hits = 0;
  for (const c of n) if (h.includes(c)) hits++;
  return Math.floor((hits / Math.max(n.length, 1)) * 40);
}

// ── Search ───────────────────────────────────────────────────────────────────
// AnimeHeaven's fastsearch.php uses single-quoted attributes and a leading slash:
//   <a class='ac' href='/anime.php?{id}'>…<div class='fastname'>Title</div>…</a>

async function searchHeaven(query: string): Promise<{ id: string; title: string }[]> {
  const res = await fetch(
    `${BASE}/fastsearch.php?xhr=1&s=${encodeURIComponent(query)}`,
    {
      headers: { ...BASE_HEADERS, Accept: "text/html,*/*" },
      next: { revalidate: 300 },
    }
  );
  if (!res.ok) return [];
  const html = await res.text();

  const results: { id: string; title: string }[] = [];
  // href uses single quotes and a leading slash: href='/anime.php?{id}'
  const re = /<a\b[^>]+href=['"]\/anime\.php\?([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1].trim();
    const inner = m[2];
    // class uses single quotes too: class='fastname'
    const t =
      inner.match(/class=['"][^'"]*fastname[^'"]*['"][^>]*>([^<]+)/)?.[1]?.trim() ||
      inner.match(/alt=['"]([^'"]+)['"]/)?.[1]?.trim() ||
      "";
    // Unescape HTML entities (e.g. &#039; → ')
    const title = t.replace(/&#0*39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    if (id && title) results.push({ id, title });
  }
  return results;
}

async function findAnimeId(title: string, titleAlt: string): Promise<string | null> {
  const base = title.replace(/['']s\b/gi, "");
  const variants = Array.from(
    new Set(
      [
        title,
        base,
        title.replace(/['']/g, ""),
        title.split(/[:|-]/)[0]?.trim(),
        base.split(/\s+/).slice(0, 3).join(" "),
        title.split(/\s+/)[0],
        ...(titleAlt ? [titleAlt, titleAlt.split(/[:|-]/)[0]?.trim()] : []),
      ].filter((v): v is string => Boolean(v && v.trim().length >= 3))
    )
  );

  const seen = new Map<string, { id: string; title: string }>();
  for (const v of variants) {
    const hits = await searchHeaven(v).catch(() => []);
    for (const h of hits) seen.set(h.id, h);
    if (hits.some((r) => titleScore(title, r.title) >= 80)) break;
  }

  if (!seen.size) return null;

  const scored = [...seen.values()].map((r) => ({
    ...r,
    s: Math.max(
      titleScore(title, r.title),
      titleAlt ? titleScore(titleAlt, r.title) : 0
    ),
  }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].s >= 30 ? scored[0].id : null;
}

// ── Episodes ──────────────────────────────────────────────────────────────────
// Episode links use single-quoted outer attr, double-quoted JS string:
//   onmouseover='gateh("key")' onclick='gatea("key")'
// Episode number is inside: <div class=' watch2 bc '>01</div>

async function getEpisodes(animeId: string): Promise<{ id: string; num: number }[]> {
  const res = await fetch(`${BASE}/anime.php?${animeId}`, {
    headers: { ...BASE_HEADERS },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const episodes: { id: string; num: number }[] = [];
  // Outer attr uses single quotes, JS arg uses double quotes: 'gateh("key")'
  const re = /on(?:mouseover|click)='gate[ha]\("([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const key = m[1];
    // Look 600 chars ahead for the episode number — class has extra spaces: class=' watch2 bc '
    const snippet = html.slice(m.index, m.index + 600);
    const numMatch = snippet.match(/class=['"][^'"]*watch2[^'"]*['"][^>]*>\s*0*(\d+)/);
    if (key && numMatch) {
      episodes.push({ id: key, num: parseInt(numMatch[1], 10) });
    }
  }

  return Array.from(new Map(episodes.map((e) => [e.id, e])).values()).sort(
    (a, b) => a.num - b.num
  );
}

// ── Stream URL ────────────────────────────────────────────────────────────────
// gate.php uses IP-based session tracking — it returns 404 unless the same IP
// has recently visited an animeheaven.me page. We always make a fresh uncached
// visit to the anime page first so this invocation's IP is recognised.

async function getStream(episodeId: string, animeId: string): Promise<string | null> {
  // Warm up IP session — must be a real fetch (no Next.js cache)
  await fetch(`${BASE}/anime.php?${animeId}`, {
    headers: BASE_HEADERS,
    cache: "no-store",
  }).catch(() => {});

  const res = await fetch(`${BASE}/gate.php`, {
    headers: {
      ...BASE_HEADERS,
      Cookie: `key=${episodeId}`,
      Referer: `${BASE}/anime.php?${animeId}`,
      Accept: "text/html,*/*",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();

  // src uses single quotes: src='https://cx.animeheaven.me/video.mp4?...'
  const sources: string[] = [];
  const re = /<source\b[^>]+src=['"]?(https?:\/\/[^'">\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) sources.push(m[1]);

  return sources.find((u) => u.includes("/video.mp4")) ?? sources[0] ?? null;
}
