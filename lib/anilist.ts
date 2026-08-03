import { useLanguageStore } from "@/store/language-store";
import { readCache, writeCache } from "./api-cache";

const MIRURO_BASE = (process.env.STREAMING_API_URL?.trim() ?? "https://miruro-api-sooty-rho.vercel.app")
  .replace(/\/$/, "")
  .replace(/^(?!https?:\/\/)/, "https://");

// ─── Public interfaces (shapes unchanged — all consumers keep working) ────────

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

// ─── Miruro API raw types ─────────────────────────────────────────────────────

interface MiruroTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

interface MiruroAnime {
  id: string;
  malId?: string | number | null;
  title: MiruroTitle;
  image: string;
  cover?: string | null;
  description?: string | null;
  status?: string | null;
  releaseDate?: number | null;
  totalEpisodes?: number | null;
  currentEpisode?: number | null;
  rating?: number | null;
  duration?: number | null;
  genres?: string[];
  studios?: string[];
  season?: string | null;
  type?: string | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  endDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  characters?: MiruroCharacter[];
  relations?: MiruroRelation[];
  recommendations?: MiruroRecommendation[];
  trailer?: { id: string; site: string; thumbnail?: string | null } | null;
  color?: string | null;
}

interface MiruroPaging {
  currentPage?: number;
  hasNextPage?: boolean;
  totalPages?: number;
  totalResults?: number;
  results: MiruroAnime[];
}

interface MiruroCharacter {
  id: string;
  role: string;
  name: { full?: string; romaji?: string; english?: string | null; native?: string | null };
  image: string;
}

interface MiruroRelation {
  id: string;
  relationType: string;
  title: MiruroTitle;
  image: string;
  cover?: string | null;
  type?: string | null;
  format?: string | null;
  status?: string | null;
}

interface MiruroRecommendation {
  id: string;
  title: MiruroTitle;
  image: string;
  rating?: number | null;
  type?: string | null;
  status?: string | null;
  episodes?: number | null;
}

interface MiruroScheduleEntry {
  id: number;
  airingAt: number;
  episode: number;
  anime: MiruroAnime;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapStatus(s: string | null | undefined): AnimeMedia["status"] {
  if (!s) return null;
  const map: Record<string, AnimeMedia["status"]> = {
    Ongoing: "RELEASING",
    RELEASING: "RELEASING",
    Completed: "FINISHED",
    FINISHED: "FINISHED",
    "Not yet aired": "NOT_YET_RELEASED",
    NOT_YET_RELEASED: "NOT_YET_RELEASED",
    Cancelled: "CANCELLED",
    CANCELLED: "CANCELLED",
    Hiatus: "HIATUS",
    HIATUS: "HIATUS",
  };
  return map[s] ?? null;
}

function mapFormat(t: string | null | undefined): AnimeMedia["format"] {
  if (!t) return null;
  const map: Record<string, AnimeMedia["format"]> = {
    TV: "TV",
    "TV Short": "TV_SHORT",
    TV_SHORT: "TV_SHORT",
    Movie: "MOVIE",
    MOVIE: "MOVIE",
    Special: "SPECIAL",
    SPECIAL: "SPECIAL",
    OVA: "OVA",
    ONA: "ONA",
    Music: "MUSIC",
    MUSIC: "MUSIC",
  };
  return map[t] ?? null;
}

function toMedia(a: MiruroAnime): AnimeMedia {
  return {
    id: parseInt(a.id, 10),
    title: {
      romaji: a.title.romaji ?? "",
      english: a.title.english ?? null,
      native: a.title.native ?? null,
    },
    coverImage: { large: a.image, extraLarge: a.image },
    bannerImage: a.cover ?? null,
    description: a.description ?? null,
    genres: a.genres ?? [],
    averageScore: a.rating ?? null,
    episodes: a.totalEpisodes ?? null,
    status: mapStatus(a.status),
    format: mapFormat(a.type),
    seasonYear: a.releaseDate ?? null,
  };
}

function toDetail(a: MiruroAnime): AnimeDetail {
  const characters: CharacterEntry[] = (a.characters ?? []).map((c) => ({
    role: c.role,
    node: {
      id: parseInt(c.id, 10),
      name: { full: c.name.full ?? c.name.romaji ?? "" },
      image: { large: c.image },
    },
  }));

  const relations: RelationEntry[] = (a.relations ?? []).map((r) => ({
    relationType: r.relationType,
    node: {
      id: parseInt(r.id, 10),
      title: { romaji: r.title.romaji ?? "", english: r.title.english ?? null },
      coverImage: { large: r.image },
      format: r.format ?? null,
      type: r.type ?? "ANIME",
    },
  }));

  const recommendations = (a.recommendations ?? []).map((r) => ({
    mediaRecommendation: {
      id: parseInt(r.id, 10),
      title: {
        romaji: r.title.romaji ?? "",
        english: r.title.english ?? null,
        native: r.title.native ?? null,
      },
      coverImage: { large: r.image, extraLarge: r.image },
      bannerImage: null,
      description: null,
      genres: [],
      averageScore: r.rating ?? null,
      episodes: r.episodes ?? null,
      status: mapStatus(r.status),
      format: mapFormat(r.type),
      seasonYear: null,
    } satisfies AnimeMedia,
  }));

  return {
    id: parseInt(a.id, 10),
    idMal: a.malId != null ? parseInt(String(a.malId), 10) : null,
    title: {
      romaji: a.title.romaji ?? "",
      english: a.title.english ?? null,
      native: a.title.native ?? null,
    },
    coverImage: { large: a.image, extraLarge: a.image },
    bannerImage: a.cover ?? null,
    description: a.description ?? null,
    genres: a.genres ?? [],
    averageScore: a.rating ?? null,
    episodes: a.totalEpisodes ?? null,
    duration: a.duration ?? null,
    status: mapStatus(a.status),
    format: mapFormat(a.type),
    season: a.season ?? null,
    seasonYear: a.releaseDate ?? null,
    startDate: {
      year: a.startDate?.year ?? null,
      month: a.startDate?.month ?? null,
      day: a.startDate?.day ?? null,
    },
    endDate: {
      year: a.endDate?.year ?? null,
      month: a.endDate?.month ?? null,
      day: a.endDate?.day ?? null,
    },
    source: null,
    studios: { nodes: (a.studios ?? []).map((name) => ({ name })) },
    trailer: a.trailer ? { id: a.trailer.id, site: a.trailer.site } : null,
    characters: { edges: characters },
    staff: { edges: [] },
    relations: { edges: relations },
    recommendations: { nodes: recommendations },
    externalLinks: [],
  };
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function miruro<T>(path: string): Promise<T> {
  const res = await fetch(`${MIRURO_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Miruro ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Exported functions ───────────────────────────────────────────────────────

const HERO_PIN_ID = 178789;

type HomeData = {
  heroItems: AnimeMedia[];
  trending: AnimeMedia[];
  popular: AnimeMedia[];
  topRated: AnimeMedia[];
  newSeason: AnimeMedia[];
};

export async function getHomeData(): Promise<HomeData> {
  try {
    const [trending, popular, topRated, newSeason, pinned] = await Promise.all([
      miruro<MiruroPaging>("/trending?per_page=16"),
      miruro<MiruroPaging>("/popular?per_page=16"),
      miruro<MiruroPaging>("/filter?sort=SCORE_DESC&status=FINISHED&per_page=16").catch(() => null),
      miruro<MiruroPaging>("/filter?sort=TRENDING_DESC&status=RELEASING&per_page=16").catch(() => null),
      miruro<MiruroAnime>(`/info/${HERO_PIN_ID}`).catch(() => null),
    ]);

    const trendingMedia  = (trending?.results  ?? []).map(toMedia);
    const popularMedia   = (popular?.results   ?? []).map(toMedia);
    const topRatedMedia  = (topRated?.results  ?? []).map(toMedia);
    const newSeasonMedia = (newSeason?.results ?? []).map(toMedia);
    const pinnedMedia    = pinned ? toMedia(pinned) : null;

    const heroItems: AnimeMedia[] = [];
    if (pinnedMedia?.bannerImage) heroItems.push(pinnedMedia);
    for (const m of [...newSeasonMedia, ...trendingMedia]) {
      if (heroItems.length >= 4) break;
      if (!m.bannerImage || m.status !== "RELEASING") continue;
      if (heroItems.some((h) => h.id === m.id)) continue;
      heroItems.push(m);
    }

    const result: HomeData = { heroItems, trending: trendingMedia, popular: popularMedia, topRated: topRatedMedia, newSeason: newSeasonMedia };
    writeCache("home", result); // fire-and-forget, never awaited
    return result;
  } catch (err) {
    console.error("[getHomeData] API unavailable, serving cached data:", err);
    const cached = await readCache<HomeData>("home");
    if (cached) return cached;
    throw err;
  }
}

export function preferredTitle(anime: AnimeMedia): string {
  return anime.title.english || anime.title.romaji;
}

export function usePreferredTitle(anime: AnimeMedia): string {
  const lang = useLanguageStore((s) => s.titleLanguage);
  if (lang === "native") return anime.title.native || anime.title.english || anime.title.romaji;
  if (lang === "romaji") return anime.title.romaji;
  return anime.title.english || anime.title.romaji;
}

export async function getAnimeDetail(id: number): Promise<AnimeDetail | null> {
  try {
    const data = await miruro<MiruroAnime>(`/info/${id}`);
    const detail = toDetail(data);
    writeCache(`anime:${id}`, detail);
    return detail;
  } catch (err) {
    console.error(`[getAnimeDetail] API unavailable for ${id}, serving cached data:`, err);
    return readCache<AnimeDetail>(`anime:${id}`);
  }
}

export async function getWeeklySchedule(): Promise<AiringEntry[]> {
  try {
    const raw = await miruro<MiruroScheduleEntry[] | { results?: MiruroScheduleEntry[] }>("/schedule");
    const entries: MiruroScheduleEntry[] = Array.isArray(raw) ? raw : (raw.results ?? []);
    const seen = new Set<string>();

    const result = entries
      .filter((e) => e.anime)
      .map((e) => ({
        id: e.id,
        airingAt: e.airingAt,
        episode: e.episode,
        media: { ...toMedia(e.anime), season: e.anime.season ?? null },
      }))
      .filter(({ media, episode }) => {
        const key = `${media.id}-${episode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    writeCache("schedule", result);
    return result;
  } catch (err) {
    console.error("[getWeeklySchedule] API unavailable, serving cached data:", err);
    return (await readCache<AiringEntry[]>("schedule")) ?? [];
  }
}

export async function getTrendingPage(page: number): Promise<BrowsePage> {
  return browseAnime({ sort: "TRENDING_DESC", page });
}

export const ANIME_GENRES = [
  "Action", "Fantasy", "Slice of Life", "Adventure", "Comedy", "Romance",
  "Drama", "Supernatural", "Sci-Fi", "Mystery", "Psychological", "Sports",
  "Horror", "Music", "Thriller", "Mecha",
];

export async function getTagCollection(): Promise<string[]> {
  // Miruro API does not expose a tag-collection endpoint.
  return [];
}

export async function browseAnime(filters: BrowseFilters): Promise<BrowsePage> {
  if (filters.search) {
    const params = new URLSearchParams({
      query: filters.search,
      page: String(filters.page ?? 1),
      per_page: "24",
    });
    const res = await miruro<MiruroPaging>(`/search?${params}`).catch(() => null);
    return { items: (res?.results ?? []).map(toMedia), hasNextPage: res?.hasNextPage ?? false };
  }

  const params = new URLSearchParams({ page: String(filters.page ?? 1), per_page: "24" });
  if (filters.sort)   params.set("sort", filters.sort);
  if (filters.format) params.set("format", filters.format);
  if (filters.status) params.set("status", filters.status);
  if (filters.year)   params.set("year", String(filters.year));
  if (filters.genre?.length) {
    for (const g of filters.genre) params.append("genre", g);
  }

  const res = await miruro<MiruroPaging>(`/filter?${params}`).catch(() => null);
  return { items: (res?.results ?? []).map(toMedia), hasNextPage: res?.hasNextPage ?? false };
}
