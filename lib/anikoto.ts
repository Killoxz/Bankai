import { readCache, writeCache } from "./api-cache";

const ANIKOTO_BASE = "https://anikotoapi.site";

// ─── Raw Anikoto API types ────────────────────────────────────────────────────

interface AnikotoAnime {
  id: number;
  ani_id: string;
  title: string;
  poster: string;
}

interface AnikotoEpisode {
  id: number;
  number: number;
  title?: string | null;
  episode_embed_id: string;
  embed_url: {
    sub: string;
    dub?: string | null;
  };
}

interface AnikotoPage {
  ok: boolean;
  data: AnikotoAnime[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

interface AnikotoSeries {
  ok: boolean;
  data: {
    anime: AnikotoAnime;
    episodes: AnikotoEpisode[];
  };
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function anikotoGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ANIKOTO_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Anikoto ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── ID mapping (AniList ID → Anikoto ID) ────────────────────────────────────

function saveMappings(animes: AnikotoAnime[]): void {
  for (const a of animes) {
    const aid = parseInt(a.ani_id, 10);
    if (aid > 0) writeCache(`anikoto_id:${aid}`, a.id);
  }
}

export async function getAnikotoId(anilistId: number): Promise<number | null> {
  const cached = await readCache<number>(`anikoto_id:${anilistId}`);
  if (cached !== null) return cached;

  // Scan pages 1-8 in parallel — covers ~160 most-recently-updated anime.
  // Popular / currently-airing shows land here; results are cached for future callers.
  const pages = await Promise.allSettled(
    Array.from({ length: 8 }, (_, i) =>
      anikotoGet<AnikotoPage>(`/recent-anime?page=${i + 1}&per_page=20`),
    ),
  );

  let found: number | null = null;
  for (const r of pages) {
    if (r.status !== "fulfilled") continue;
    saveMappings(r.value.data);
    const match = r.value.data.find((a) => parseInt(a.ani_id, 10) === anilistId);
    if (match) found = match.id;
  }

  return found;
}

// ─── Series episodes ──────────────────────────────────────────────────────────

async function getAnikotoSeries(anikotoId: number): Promise<AnikotoSeries["data"] | null> {
  const cacheKey = `anikoto_series:${anikotoId}`;
  const cached = await readCache<AnikotoSeries["data"]>(cacheKey);
  if (cached) return cached;

  const res = await anikotoGet<AnikotoSeries>(`/series/${anikotoId}`);
  if (!res.ok || !res.data) return null;

  writeCache(cacheKey, res.data);
  return res.data;
}

// ─── Episodes as EpisodesMap-compatible shape ─────────────────────────────────
// The id field on each episode is set to the embed URL so the stream route
// can detect it and pass it through directly to the iframe player.

export async function fetchAnikotoEpisodesAsMap(
  anilistId: number,
): Promise<Record<string, unknown> | null> {
  const anikotoId = await getAnikotoId(anilistId);
  if (!anikotoId) return null;

  const series = await getAnikotoSeries(anikotoId);
  if (!series) return null;

  const subEps = series.episodes.map((ep) => ({
    id: ep.embed_url.sub,
    number: ep.number,
    title: ep.title ?? `Episode ${ep.number}`,
  }));

  const dubEps = series.episodes
    .filter((ep) => ep.embed_url.dub)
    .map((ep) => ({
      id: ep.embed_url.dub!,
      number: ep.number,
      title: ep.title ?? `Episode ${ep.number}`,
    }));

  return {
    anikoto: {
      provider: "anikoto",
      episodes: {
        sub: subEps,
        ...(dubEps.length > 0 ? { dub: dubEps } : {}),
      },
    },
  };
}
