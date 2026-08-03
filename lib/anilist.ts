import { useLanguageStore } from "@/store/language-store";
import { readCache, writeCache } from "./api-cache";

const ANILIST = "https://graphql.anilist.co";

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

// ─── AniList raw types ────────────────────────────────────────────────────────

interface ALTitle { romaji?: string | null; english?: string | null; native?: string | null; }
interface ALCoverImage { large?: string | null; extraLarge?: string | null; }
interface ALMedia {
  id: number;
  idMal?: number | null;
  title: ALTitle;
  coverImage: ALCoverImage;
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
  studios?: { nodes: { name: string }[] };
  nextAiringEpisode?: { episode: number; airingAt: number; timeUntilAiring: number } | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  endDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  trailer?: { id: string; site: string; thumbnail?: string | null } | null;
  characters?: { edges: { role: string; node: { id: number; name: { full?: string }; image?: { large?: string | null } } }[] };
  staff?: { edges: { role: string; node: { id: number; name: { full?: string }; image?: { large?: string | null } } }[] };
  relations?: { edges: { relationType: string; node: { id: number; type?: string | null; title: ALTitle; coverImage: ALCoverImage; format?: string | null } }[] };
  recommendations?: { nodes: { rating?: number | null; mediaRecommendation: ALMedia | null }[] };
  externalLinks?: { url: string; site: string; type: string; color?: string | null; icon?: string | null; language?: string | null }[];
}

// ─── GraphQL fragments & queries ──────────────────────────────────────────────

const MEDIA_FRAGMENT = `
  fragment MF on Media {
    id idMal
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    description(asHtml: false)
    format season seasonYear episodes duration
    status averageScore genres source
    studios(isMain: true) { nodes { name } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    trailer { id site thumbnail }
  }
`;

const PAGE_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort!], $status: MediaStatus,
         $format: MediaFormat, $seasonYear: Int, $genre_in: [String], $search: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: ANIME, sort: $sort, status: $status, format: $format,
            seasonYear: $seasonYear, genre_in: $genre_in, search: $search, isAdult: false) {
        ...MF
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ...MF
      characters(sort: [ROLE, RELEVANCE], perPage: 25) {
        edges { role node { id name { full } image { large } } }
      }
      staff(sort: [RELEVANCE, ID], perPage: 12) {
        edges { role node { id name { full } image { large } } }
      }
      relations {
        edges { relationType(version: 2) node { id type title { romaji english } coverImage { large } format } }
      }
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes { rating mediaRecommendation { ...MF } }
      }
      externalLinks { url site type color icon language }
    }
  }
  ${MEDIA_FRAGMENT}
`;

const SCHEDULE_QUERY = `
  query ($from: Int, $to: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
        id airingAt episode
        media { ...MF }
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json() as { data: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(", "));
  return json.data;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function toMedia(m: ALMedia): AnimeMedia {
  return {
    id: m.id,
    title: {
      romaji: m.title.romaji ?? "",
      english: m.title.english ?? null,
      native: m.title.native ?? null,
    },
    coverImage: {
      large: m.coverImage.large ?? m.coverImage.extraLarge ?? "",
      extraLarge: m.coverImage.extraLarge ?? null,
    },
    bannerImage: m.bannerImage ?? null,
    description: m.description ?? null,
    genres: m.genres ?? [],
    averageScore: m.averageScore ?? null,
    episodes: m.episodes ?? null,
    status: (m.status as AnimeMedia["status"]) ?? null,
    format: (m.format as AnimeMedia["format"]) ?? null,
    seasonYear: m.seasonYear ?? null,
  };
}

function toDetail(m: ALMedia): AnimeDetail {
  const characters: CharacterEntry[] = (m.characters?.edges ?? []).map((e) => ({
    role: e.role,
    node: { id: e.node.id, name: { full: e.node.name.full ?? "" }, image: { large: e.node.image?.large ?? null } },
  }));

  const staff: StaffEntry[] = (m.staff?.edges ?? []).map((e) => ({
    role: e.role,
    node: { id: e.node.id, name: { full: e.node.name.full ?? "" }, image: { large: e.node.image?.large ?? null } },
  }));

  const relations: RelationEntry[] = (m.relations?.edges ?? []).map((e) => ({
    relationType: e.relationType,
    node: {
      id: e.node.id,
      title: { romaji: e.node.title.romaji ?? "", english: e.node.title.english ?? null },
      coverImage: { large: e.node.coverImage.large ?? e.node.coverImage.extraLarge ?? "" },
      format: e.node.format ?? null,
      type: e.node.type ?? "ANIME",
    },
  }));

  const recommendations = (m.recommendations?.nodes ?? [])
    .filter((n): n is typeof n & { mediaRecommendation: ALMedia } => n.mediaRecommendation !== null)
    .map((n) => ({ mediaRecommendation: toMedia(n.mediaRecommendation) }));

  return {
    id: m.id,
    idMal: m.idMal ?? null,
    title: { romaji: m.title.romaji ?? "", english: m.title.english ?? null, native: m.title.native ?? null },
    coverImage: { large: m.coverImage.large ?? m.coverImage.extraLarge ?? "", extraLarge: m.coverImage.extraLarge ?? null },
    bannerImage: m.bannerImage ?? null,
    description: m.description ?? null,
    genres: m.genres ?? [],
    averageScore: m.averageScore ?? null,
    episodes: m.episodes ?? null,
    duration: m.duration ?? null,
    status: (m.status as AnimeDetail["status"]) ?? null,
    format: (m.format as AnimeDetail["format"]) ?? null,
    season: m.season ?? null,
    seasonYear: m.seasonYear ?? null,
    startDate: { year: m.startDate?.year ?? null, month: m.startDate?.month ?? null, day: m.startDate?.day ?? null },
    endDate: { year: m.endDate?.year ?? null, month: m.endDate?.month ?? null, day: m.endDate?.day ?? null },
    source: m.source ?? null,
    studios: { nodes: (m.studios?.nodes ?? []).map((s) => ({ name: s.name })) },
    trailer: m.trailer ? { id: m.trailer.id, site: m.trailer.site } : null,
    characters: { edges: characters },
    staff: { edges: staff },
    relations: { edges: relations },
    recommendations: { nodes: recommendations },
    externalLinks: (m.externalLinks ?? []).map((l) => ({
      url: l.url, site: l.site, type: l.type,
      color: l.color ?? null, icon: l.icon ?? null, language: l.language ?? null,
    })),
  };
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

type PageData = { Page: { pageInfo: { hasNextPage: boolean }; media: ALMedia[] } };
type DetailData = { Media: ALMedia };
type ScheduleData = { Page: { airingSchedules: { id: number; airingAt: number; episode: number; media: ALMedia }[] } };

export async function getHomeData(): Promise<HomeData> {
  try {
    const [trending, popular, topRated, newSeason, pinnedDetail] = await Promise.all([
      gql<PageData>(PAGE_QUERY, { sort: ["TRENDING_DESC"], perPage: 16 }),
      gql<PageData>(PAGE_QUERY, { sort: ["POPULARITY_DESC"], perPage: 16 }),
      gql<PageData>(PAGE_QUERY, { sort: ["SCORE_DESC"], status: "FINISHED", perPage: 16 }).catch(() => null),
      gql<PageData>(PAGE_QUERY, { sort: ["TRENDING_DESC"], status: "RELEASING", perPage: 16 }).catch(() => null),
      gql<DetailData>(DETAIL_QUERY, { id: HERO_PIN_ID }).catch(() => null),
    ]);

    const trendingMedia  = (trending.Page.media).map(toMedia);
    const popularMedia   = (popular.Page.media).map(toMedia);
    const topRatedMedia  = (topRated?.Page.media ?? []).map(toMedia);
    const newSeasonMedia = (newSeason?.Page.media ?? []).map(toMedia);
    const pinnedMedia    = pinnedDetail ? toMedia(pinnedDetail.Media) : null;

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
    console.error("[getHomeData] AniList unavailable, serving cached data:", err);
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
    const data = await gql<DetailData>(DETAIL_QUERY, { id });
    const detail = toDetail(data.Media);
    writeCache(`anime:${id}`, detail);
    return detail;
  } catch (err) {
    console.error(`[getAnimeDetail] AniList unavailable for ${id}, serving cached data:`, err);
    return readCache<AnimeDetail>(`anime:${id}`);
  }
}

export async function getWeeklySchedule(): Promise<AiringEntry[]> {
  try {
    const now  = Math.floor(Date.now() / 1000);
    const from = now - 86400;          // yesterday
    const to   = now + 7 * 86400;     // 7 days ahead
    const data = await gql<ScheduleData>(SCHEDULE_QUERY, { from, to });
    const seen = new Set<string>();

    const result = data.Page.airingSchedules
      .filter((e) => e.media)
      .map((e) => ({
        id: e.id,
        airingAt: e.airingAt,
        episode: e.episode,
        media: { ...toMedia(e.media), season: e.media.season ?? null },
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
    console.error("[getWeeklySchedule] AniList unavailable, serving cached data:", err);
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
  const vars: Record<string, unknown> = {
    page: filters.page ?? 1,
    perPage: 24,
    sort: [filters.sort ?? "TRENDING_DESC"],
  };
  if (filters.format)        vars.format     = filters.format;
  if (filters.status)        vars.status     = filters.status;
  if (filters.year)          vars.seasonYear = filters.year;
  if (filters.genre?.length) vars.genre_in   = filters.genre;
  if (filters.search)        vars.search     = filters.search;

  const data = await gql<PageData>(PAGE_QUERY, vars).catch(() => null);
  return {
    items:       (data?.Page.media ?? []).map(toMedia),
    hasNextPage: data?.Page.pageInfo.hasNextPage ?? false,
  };
}
