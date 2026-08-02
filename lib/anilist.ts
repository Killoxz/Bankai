import { useLanguageStore } from "@/store/language-store";
import { readCache, writeCache } from "./api-cache";

const JIKAN = "https://api.jikan.moe/v4";
const ARM   = "https://arm.haglund.dev/api/v2/ids";

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface AnimeMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; extraLarge: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS" | null;
  format: "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC" | null;
  seasonYear: number | null;
}

export interface CharacterEntry {
  role: string;
  node: { id: number; name: { full: string }; image: { large: string | null } };
}

export interface StaffEntry {
  role: string;
  node: { id: number; name: { full: string }; image: { large: string | null } };
}

export interface RelationEntry {
  relationType: string;
  node: {
    id: number;
    title: { romaji: string; english: string | null };
    coverImage: { large: string };
    format: string | null;
    type: string;
  };
}

export interface ExternalLink {
  url: string;
  site: string;
  type: string;
  color: string | null;
  icon: string | null;
  language: string | null;
}

export interface AnimeDetail {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; extraLarge: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  duration: number | null;
  status: AnimeMedia["status"];
  format: AnimeMedia["format"];
  season: string | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  source: string | null;
  studios: { nodes: { name: string }[] };
  trailer: { id: string; site: string } | null;
  characters: { edges: CharacterEntry[] };
  staff: { edges: StaffEntry[] };
  relations: { edges: RelationEntry[] };
  recommendations: { nodes: { mediaRecommendation: AnimeMedia | null }[] };
  externalLinks: ExternalLink[];
}

export interface AiringEntry {
  id: number;
  airingAt: number;
  episode: number;
  media: AnimeMedia & { season: string | null };
}

export interface BrowseFilters {
  page?: number;
  format?: AnimeMedia["format"];
  status?: AnimeMedia["status"];
  genre?: string[];
  tag?: string[];
  year?: number;
  sort?: "TRENDING_DESC" | "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE_DESC";
  search?: string;
}

export interface BrowsePage {
  items: AnimeMedia[];
  hasNextPage: boolean;
}

// ─── Jikan raw types ──────────────────────────────────────────────────────────

interface JImage { image_url: string; large_image_url?: string }

interface JAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: { jpg: JImage };
  trailer: { youtube_id: string | null; images?: { maximum_image_url: string | null } } | null;
  synopsis: string | null;
  type: string | null;
  episodes: number | null;
  status: string | null;
  score: number | null;
  genres: { name: string }[];
  themes?: { name: string }[];
  year: number | null;
  season: string | null;
  duration: string | null;
  aired?: { from: string | null };
  studios: { name: string }[];
  relations?: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[];
  broadcast?: { day: string | null; time: string | null; timezone: string | null };
}

interface JCharacter {
  character: { mal_id: number; name: string; images: { jpg: JImage } };
  role: string;
}

interface JRecommendation {
  entry: { mal_id: number; title: string; images: { jpg: JImage } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function jikanGet<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Jikan ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

async function armLookup(source: "anilist" | "myanimelist", id: number): Promise<Record<string, number | null> | null> {
  try {
    const res = await fetch(`${ARM}?source=${source}&id=${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, number | null>>;
  } catch { return null; }
}

function mapStatus(s: string | null | undefined): AnimeMedia["status"] {
  const m: Record<string, AnimeMedia["status"]> = {
    "Currently Airing": "RELEASING", "Finished Airing": "FINISHED",
    "Not yet aired": "NOT_YET_RELEASED", "On Hiatus": "HIATUS",
  };
  return (s && m[s]) ? m[s]! : null;
}

function mapFormat(t: string | null | undefined): AnimeMedia["format"] {
  const m: Record<string, AnimeMedia["format"]> = {
    TV: "TV", "TV Short": "TV_SHORT", Movie: "MOVIE",
    Special: "SPECIAL", OVA: "OVA", ONA: "ONA", Music: "MUSIC",
  };
  return (t && m[t]) ? m[t]! : null;
}

function parseDuration(s: string | null | undefined): number | null {
  if (!s) return null;
  const hr  = s.match(/(\d+)\s*hr/);
  const min = s.match(/(\d+)\s*min/);
  const v   = (hr ? parseInt(hr[1]) * 60 : 0) + (min ? parseInt(min[1]) : 0);
  return v > 0 ? v : null;
}

function cover(a: JAnime): string {
  return a.images.jpg.large_image_url ?? a.images.jpg.image_url;
}

// Build an AnimeMedia from a Jikan result.
// id defaults to mal_id so the homepage never needs ARM.
function toMedia(a: JAnime, id?: number): AnimeMedia {
  return {
    id: id ?? a.mal_id,
    title: { romaji: a.title ?? "", english: a.title_english ?? null, native: a.title_japanese ?? null },
    coverImage: { large: cover(a), extraLarge: cover(a) },
    bannerImage: a.trailer?.images?.maximum_image_url ?? null,
    description: a.synopsis ?? null,
    genres: [...(a.genres?.map(g => g.name) ?? []), ...(a.themes?.map(t => t.name) ?? [])],
    averageScore: a.score != null ? Math.round(a.score * 10) : null,
    episodes: a.episodes ?? null,
    status:   mapStatus(a.status),
    format:   mapFormat(a.type),
    seasonYear: a.year ?? null,
  };
}

// ─── Home data ────────────────────────────────────────────────────────────────

type HomeData = {
  heroItems: AnimeMedia[];
  trending:  AnimeMedia[];
  popular:   AnimeMedia[];
  topRated:  AnimeMedia[];
  newSeason: AnimeMedia[];
};

export async function getHomeData(): Promise<HomeData> {
  try {
    const [airRes, popRes, topRes, seasonRes] = await Promise.all([
      jikanGet<{ data: JAnime[] }>("/top/anime?filter=airing&limit=20&sfw=true"),
      jikanGet<{ data: JAnime[] }>("/top/anime?filter=bypopularity&limit=16&sfw=true"),
      jikanGet<{ data: JAnime[] }>("/top/anime?limit=16&sfw=true"),
      jikanGet<{ data: JAnime[] }>("/seasons/now?limit=16&sfw=true").catch(() => null),
    ]);

    // Convert immediately using MAL IDs — no ARM needed, never blocks rendering.
    const trending  = (airRes?.data    ?? []).map(a => toMedia(a));
    const popular   = (popRes?.data    ?? []).map(a => toMedia(a));
    const topRated  = (topRes?.data    ?? []).map(a => toMedia(a));
    const newSeason = (seasonRes?.data ?? []).map(a => toMedia(a));

    const heroItems: AnimeMedia[] = [];
    for (const m of [...newSeason, ...trending]) {
      if (heroItems.length >= 5) break;
      if (!m.bannerImage) continue;
      if (heroItems.some(h => h.id === m.id)) continue;
      heroItems.push(m);
    }

    const result: HomeData = { heroItems, trending, popular, topRated, newSeason };
    writeCache("home_jikan", result);
    return result;
  } catch (err) {
    console.error("[getHomeData] Jikan failed:", err);
    const cached =
      (await readCache<HomeData>("home_jikan")) ??
      (await readCache<HomeData>("home"));
    if (cached) return cached;
    throw err;
  }
}

// ─── Title helpers ────────────────────────────────────────────────────────────

export function preferredTitle(anime: AnimeMedia): string {
  return anime.title.english || anime.title.romaji;
}

export function usePreferredTitle(anime: AnimeMedia): string {
  const lang = useLanguageStore(s => s.titleLanguage);
  if (lang === "native") return anime.title.native || anime.title.english || anime.title.romaji;
  if (lang === "romaji") return anime.title.romaji;
  return anime.title.english || anime.title.romaji;
}

// ─── Anime detail ─────────────────────────────────────────────────────────────

// Resolves an ID (AniList or MAL) to a { malId, anilistId } pair.
async function resolveIds(id: number): Promise<{ malId: number; anilistId: number }> {
  // Try treating id as an AniList ID first.
  const byAnilist = await armLookup("anilist", id);
  if (byAnilist?.myanimelist) {
    return { malId: byAnilist.myanimelist, anilistId: id };
  }
  // Try treating id as a MAL ID.
  const byMal = await armLookup("myanimelist", id);
  if (byMal?.myanimelist === id && byMal?.anilist) {
    return { malId: id, anilistId: byMal.anilist };
  }
  // ARM couldn't map it either way — treat id as its own MAL ID.
  return { malId: id, anilistId: id };
}

export async function getAnimeDetail(id: number): Promise<AnimeDetail | null> {
  const cacheKey = `anime:${id}`;
  try {
    const { malId, anilistId } = await resolveIds(id);

    const [fullRes, charsRes, recsRes] = await Promise.all([
      jikanGet<{ data: JAnime }>(`/anime/${malId}/full`),
      jikanGet<{ data: JCharacter[] }>(`/anime/${malId}/characters`).catch(() => null),
      jikanGet<{ data: JRecommendation[] }>(`/anime/${malId}/recommendations`).catch(() => null),
    ]);

    const a = fullRes.data;

    const characters: CharacterEntry[] = (charsRes?.data ?? []).slice(0, 24).map(c => ({
      role: c.role,
      node: {
        id: c.character.mal_id,
        name: { full: c.character.name },
        image: { large: c.character.images.jpg.large_image_url ?? c.character.images.jpg.image_url ?? null },
      },
    }));

    // Relations — use MAL IDs for links (resolveIds handles them on detail load)
    const relations: RelationEntry[] = (a.relations ?? []).flatMap(r =>
      r.entry
        .filter(e => e.type === "anime")
        .map(e => ({
          relationType: r.relation.toUpperCase().replace(/ /g, "_"),
          node: { id: e.mal_id, title: { romaji: e.name, english: null }, coverImage: { large: "" }, format: null, type: "ANIME" },
        }))
    );

    const recommendations = (recsRes?.data ?? []).slice(0, 10).map(r => {
      const img = r.entry.images.jpg.large_image_url ?? r.entry.images.jpg.image_url;
      return {
        mediaRecommendation: {
          id: r.entry.mal_id,
          title: { romaji: r.entry.title, english: null, native: null },
          coverImage: { large: img, extraLarge: img },
          bannerImage: null, description: null, genres: [],
          averageScore: null, episodes: null, status: null, format: null, seasonYear: null,
        } satisfies AnimeMedia,
      };
    });

    const fromDate = a.aired?.from ? new Date(a.aired.from) : null;

    const detail: AnimeDetail = {
      id: anilistId,
      idMal: malId,
      title: { romaji: a.title ?? "", english: a.title_english ?? null, native: a.title_japanese ?? null },
      coverImage: { large: cover(a), extraLarge: cover(a) },
      bannerImage: a.trailer?.images?.maximum_image_url ?? null,
      description: a.synopsis ?? null,
      genres: [...(a.genres?.map(g => g.name) ?? []), ...(a.themes?.map(t => t.name) ?? [])],
      averageScore: a.score != null ? Math.round(a.score * 10) : null,
      episodes: a.episodes ?? null,
      duration: parseDuration(a.duration),
      status:   mapStatus(a.status),
      format:   mapFormat(a.type),
      season:   a.season ? a.season.toUpperCase() : null,
      seasonYear: a.year ?? null,
      startDate: {
        year:  fromDate?.getFullYear()           ?? null,
        month: fromDate ? fromDate.getMonth() + 1 : null,
        day:   fromDate?.getDate()               ?? null,
      },
      endDate: { year: null, month: null, day: null },
      source: null,
      studios: { nodes: (a.studios ?? []).map(s => ({ name: s.name })) },
      trailer: a.trailer?.youtube_id ? { id: a.trailer.youtube_id, site: "youtube" } : null,
      characters:      { edges: characters },
      staff:           { edges: [] },
      relations:       { edges: relations },
      recommendations: { nodes: recommendations },
      externalLinks:   [],
    };

    writeCache(cacheKey, detail);
    return detail;
  } catch (err) {
    console.error(`[getAnimeDetail] Failed for ${id}:`, err);
    return readCache<AnimeDetail>(cacheKey);
  }
}

// ─── Weekly schedule ──────────────────────────────────────────────────────────

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function nextOccurrence(day: string, time: string | null): number {
  const idx = DAYS.indexOf(day.toLowerCase() as typeof DAYS[number]);
  if (idx < 0) return Math.floor(Date.now() / 1000);
  const now    = new Date();
  const target = (idx + 1) % 7; // Jikan monday=0 → JS Date monday=1
  let diff = (target - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  if (time) { const [h, m] = time.split(":").map(Number); next.setHours(h, m, 0, 0); }
  return Math.floor(next.getTime() / 1000);
}

export async function getWeeklySchedule(): Promise<AiringEntry[]> {
  try {
    const dayResults = await Promise.allSettled(
      DAYS.map(day => jikanGet<{ data: JAnime[] }>(`/schedules?filter=${day}&limit=25&sfw=true`))
    );

    const seen = new Set<string>();
    const entries: AiringEntry[] = [];

    dayResults.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      for (const a of r.value.data ?? []) {
        const key = `${a.mal_id}-${DAYS[i]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
          id:      a.mal_id,
          airingAt: nextOccurrence(DAYS[i], a.broadcast?.time ?? null),
          episode: 1,
          media:   { ...toMedia(a), season: a.season ? a.season.toUpperCase() : null },
        });
      }
    });

    entries.sort((a, b) => a.airingAt - b.airingAt);
    writeCache("schedule", entries);
    return entries;
  } catch (err) {
    console.error("[getWeeklySchedule] Jikan failed:", err);
    return (await readCache<AiringEntry[]>("schedule")) ?? [];
  }
}

// ─── Browse / filter ──────────────────────────────────────────────────────────

export const ANIME_GENRES = [
  "Action", "Fantasy", "Slice of Life", "Adventure", "Comedy", "Romance",
  "Drama", "Supernatural", "Sci-Fi", "Mystery", "Psychological", "Sports",
  "Horror", "Music", "Thriller", "Mecha",
];

export async function getTagCollection(): Promise<string[]> { return []; }

export async function getTrendingPage(page: number): Promise<BrowsePage> {
  return browseAnime({ sort: "TRENDING_DESC", page });
}

const GENRE_IDS: Record<string, number> = {
  Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Fantasy: 10, Horror: 14,
  Mystery: 7, Romance: 22, "Sci-Fi": 24, "Slice of Life": 36, Sports: 30,
  Supernatural: 37, Thriller: 41, Mecha: 18, Music: 19, Psychological: 40,
};

export async function browseAnime(filters: BrowseFilters): Promise<BrowsePage> {
  try {
    const page  = filters.page ?? 1;
    const limit = 24;

    let jikanPath: string;
    const simple = !filters.format && !filters.status && !filters.genre && !filters.year && !filters.search;

    if (filters.search) {
      const p = new URLSearchParams({ q: filters.search, page: String(page), limit: String(limit), sfw: "true" });
      jikanPath = `/anime?${p}`;
    } else if (simple && filters.sort === "TRENDING_DESC") {
      jikanPath = `/top/anime?filter=airing&page=${page}&limit=${limit}`;
    } else if (simple && filters.sort === "POPULARITY_DESC") {
      jikanPath = `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`;
    } else if (simple && filters.sort === "SCORE_DESC") {
      jikanPath = `/top/anime?page=${page}&limit=${limit}`;
    } else {
      const p = new URLSearchParams({ page: String(page), limit: String(limit), sfw: "true" });
      if (filters.sort === "TRENDING_DESC")   { p.set("order_by", "members");    p.set("sort", "desc"); }
      if (filters.sort === "POPULARITY_DESC") { p.set("order_by", "popularity"); p.set("sort", "asc");  }
      if (filters.sort === "SCORE_DESC")      { p.set("order_by", "score");      p.set("sort", "desc"); }
      if (filters.sort === "START_DATE_DESC") { p.set("order_by", "start_date"); p.set("sort", "desc"); }
      const fmtMap: Record<string, string> = {
        TV: "tv", MOVIE: "movie", OVA: "ova", ONA: "ona", SPECIAL: "special", MUSIC: "music", TV_SHORT: "tv",
      };
      if (filters.format) p.set("type", fmtMap[filters.format] ?? filters.format.toLowerCase());
      const stMap: Record<string, string> = { RELEASING: "airing", FINISHED: "complete", NOT_YET_RELEASED: "upcoming" };
      if (filters.status) p.set("status", stMap[filters.status] ?? "airing");
      if (filters.year) p.set("start_date", `${filters.year}-01-01`);
      const genreIds = (filters.genre ?? []).map(g => GENRE_IDS[g]).filter(Boolean);
      if (genreIds.length) p.set("genres", genreIds.join(","));
      jikanPath = `/anime?${p}`;
    }

    const res  = await jikanGet<{ data: JAnime[]; pagination?: { has_next_page: boolean } }>(jikanPath);
    const data = res.data ?? [];
    const items = data.map(a => toMedia(a));
    return { items, hasNextPage: res.pagination?.has_next_page ?? items.length === limit };
  } catch (err) {
    console.error("[browseAnime] Jikan failed:", err);
    return { items: [], hasNextPage: false };
  }
}
