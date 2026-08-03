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

// ─── API raw types (AniList-compatible fields from Miruro-API Python backend) ──

interface APITitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

interface APICoverImage {
  large?: string | null;
  extraLarge?: string | null;
}

interface APIAnime {
  id: number;
  idMal?: number | null;
  title: APITitle;
  coverImage: APICoverImage;
  bannerImage?: string | null;
  description?: string | null;
  format?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  duration?: number | null;
  status?: string | null;
  averageScore?: number | null;
  genres?: string[];
  source?: string | null;
  studios?: { nodes: { name: string; isAnimationStudio?: boolean }[] };
  nextAiringEpisode?: { episode: number; airingAt: number; timeUntilAiring: number } | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  endDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  trailer?: { id: string; site: string; thumbnail?: string | null } | null;
  characters?: { edges: APICharacterEdge[] };
  staff?: { edges: APIStaffEdge[] };
  relations?: { edges: APIRelationEdge[] };
  recommendations?: { nodes: APIRecommendationNode[] };
  externalLinks?: { url: string; site: string; type: string }[];
  // Schedule endpoint adds these fields directly onto each anime object
  next_episode?: number | null;
  airingAt?: number | null;
  timeUntilAiring?: number | null;
}

interface APICharacterEdge {
  role: string;
  node: {
    id: number;
    name: { full?: string; first?: string; last?: string };
    image?: { large?: string | null };
  };
}

interface APIStaffEdge {
  role: string;
  node: {
    id: number;
    name: { full?: string };
    image?: { large?: string | null };
  };
}

interface APIRelationEdge {
  relationType: string;
  node: {
    id: number;
    title: APITitle;
    coverImage: APICoverImage;
    format?: string | null;
    type?: string | null;
  };
}

interface APIRecommendationNode {
  rating?: number | null;
  mediaRecommendation: APIAnime | null;
}

interface APIPage {
  page?: number;
  perPage?: number;
  total?: number;
  hasNextPage?: boolean;
  results: APIAnime[];
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

function mapFormat(f: string | null | undefined): AnimeMedia["format"] {
  if (!f) return null;
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
  return map[f] ?? null;
}

function toMedia(a: APIAnime): AnimeMedia {
  return {
    id: a.id,
    title: {
      romaji: a.title.romaji ?? "",
      english: a.title.english ?? null,
      native: a.title.native ?? null,
    },
    coverImage: {
      large: a.coverImage.large ?? a.coverImage.extraLarge ?? "",
      extraLarge: a.coverImage.extraLarge ?? null,
    },
    bannerImage: a.bannerImage ?? null,
    description: a.description ?? null,
    genres: a.genres ?? [],
    averageScore: a.averageScore ?? null,
    episodes: a.episodes ?? null,
    status: mapStatus(a.status),
    format: mapFormat(a.format),
    seasonYear: a.seasonYear ?? null,
  };
}

function toDetail(a: APIAnime): AnimeDetail {
  const characters: CharacterEntry[] = (a.characters?.edges ?? []).map((e) => ({
    role: e.role,
    node: {
      id: e.node.id,
      name: { full: e.node.name.full ?? "" },
      image: { large: e.node.image?.large ?? null },
    },
  }));

  const staff: StaffEntry[] = (a.staff?.edges ?? []).map((e) => ({
    role: e.role,
    node: {
      id: e.node.id,
      name: { full: e.node.name.full ?? "" },
      image: { large: e.node.image?.large ?? null },
    },
  }));

  const relations: RelationEntry[] = (a.relations?.edges ?? []).map((e) => ({
    relationType: e.relationType,
    node: {
      id: e.node.id,
      title: { romaji: e.node.title.romaji ?? "", english: e.node.title.english ?? null },
      coverImage: { large: e.node.coverImage.large ?? e.node.coverImage.extraLarge ?? "" },
      format: mapFormat(e.node.format) ?? null,
      type: e.node.type ?? "ANIME",
    },
  }));

  const recommendations = (a.recommendations?.nodes ?? [])
    .filter((n): n is APIRecommendationNode & { mediaRecommendation: APIAnime } =>
      n.mediaRecommendation !== null
    )
    .map((n) => ({ mediaRecommendation: toMedia(n.mediaRecommendation) }));

  return {
    id: a.id,
    idMal: a.idMal ?? null,
    title: {
      romaji: a.title.romaji ?? "",
      english: a.title.english ?? null,
      native: a.title.native ?? null,
    },
    coverImage: {
      large: a.coverImage.large ?? a.coverImage.extraLarge ?? "",
      extraLarge: a.coverImage.extraLarge ?? null,
    },
    bannerImage: a.bannerImage ?? null,
    description: a.description ?? null,
    genres: a.genres ?? [],
    averageScore: a.averageScore ?? null,
    episodes: a.episodes ?? null,
    duration: a.duration ?? null,
    status: mapStatus(a.status),
    format: mapFormat(a.format),
    season: a.season ?? null,
    seasonYear: a.seasonYear ?? null,
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
    source: a.source ?? null,
    studios: { nodes: (a.studios?.nodes ?? []).map((s) => ({ name: s.name })) },
    trailer: a.trailer ? { id: a.trailer.id, site: a.trailer.site } : null,
    characters: { edges: characters },
    staff: { edges: staff },
    relations: { edges: relations },
    recommendations: { nodes: recommendations },
    externalLinks: (a.externalLinks ?? []).map((l) => ({
      url: l.url,
      site: l.site,
      type: l.type,
      color: null,
      icon: null,
      language: null,
    })),
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
      miruro<APIPage>("/trending?per_page=16"),
      miruro<APIPage>("/popular?per_page=16"),
      miruro<APIPage>("/filter?sort=SCORE_DESC&status=FINISHED&per_page=16").catch(() => null),
      miruro<APIPage>("/filter?sort=TRENDING_DESC&status=RELEASING&per_page=16").catch(() => null),
      miruro<APIAnime>(`/info/${HERO_PIN_ID}`).catch(() => null),
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
    writeCache("home", result);
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
    const data = await miruro<APIAnime>(`/info/${id}`);
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
    // Schedule endpoint returns APIAnime[] with next_episode and airingAt added per item
    const raw = await miruro<APIAnime[] | { results?: APIAnime[] }>("/schedule");
    const entries: APIAnime[] = Array.isArray(raw) ? raw : (raw.results ?? []);
    const seen = new Set<string>();

    const result = entries
      .filter((e) => e.id && e.airingAt != null)
      .map((e) => ({
        id: e.id,
        airingAt: e.airingAt!,
        episode: e.next_episode ?? 1,
        media: { ...toMedia(e), season: e.season ?? null },
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
  return [];
}

export async function browseAnime(filters: BrowseFilters): Promise<BrowsePage> {
  if (filters.search) {
    const params = new URLSearchParams({
      query: filters.search,
      page: String(filters.page ?? 1),
      per_page: "24",
    });
    const res = await miruro<APIPage>(`/search?${params}`).catch(() => null);
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

  const res = await miruro<APIPage>(`/filter?${params}`).catch(() => null);
  return { items: (res?.results ?? []).map(toMedia), hasNextPage: res?.hasNextPage ?? false };
}
