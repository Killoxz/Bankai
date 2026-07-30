import { useLanguageStore } from "@/store/language-store";

const GQL = "https://graphql.anilist.co";

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

const FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  episodes
  status
  format
  seasonYear
`;

// Mushoku Tensei: Jobless Reincarnation Season 3 — always the first hero slide
const HERO_PIN_ID = 178789;

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json.data as T;
}

interface HomeQuery {
  trending: { media: AnimeMedia[] };
  popular: { media: AnimeMedia[] };
  topRated: { media: AnimeMedia[] };
  newSeason: { media: AnimeMedia[] };
  pinned: AnimeMedia | null;
}

export async function getHomeData() {
  const data = await gql<HomeQuery>(`{
    trending: Page(perPage: 16) {
      media(sort: TRENDING_DESC, type: ANIME) { ${FIELDS} }
    }
    popular: Page(perPage: 16) {
      media(sort: POPULARITY_DESC, type: ANIME) { ${FIELDS} }
    }
    topRated: Page(perPage: 16) {
      media(sort: SCORE_DESC, type: ANIME, status: FINISHED) { ${FIELDS} }
    }
    newSeason: Page(perPage: 16) {
      media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) { ${FIELDS} }
    }
    pinned: Media(id: ${HERO_PIN_ID}, type: ANIME) { ${FIELDS} }
  }`);

  // Hero: pinned show first, then other currently-airing shows with banner art — 4 total
  const heroItems: AnimeMedia[] = [];
  if (data.pinned?.bannerImage) heroItems.push(data.pinned);
  for (const m of [...data.newSeason.media, ...data.trending.media]) {
    if (heroItems.length >= 4) break;
    if (!m.bannerImage || m.status !== "RELEASING") continue;
    if (heroItems.some((h) => h.id === m.id)) continue;
    heroItems.push(m);
  }

  return {
    heroItems,
    trending: data.trending.media,
    popular: data.popular.media,
    topRated: data.topRated.media,
    newSeason: data.newSeason.media,
  };
}

export function preferredTitle(anime: AnimeMedia): string {
  return anime.title.english || anime.title.romaji;
}

/** Client-only: respects the user's title-language preference (falls back
 * to romaji if the preferred field is missing for a given title). */
export function usePreferredTitle(anime: AnimeMedia): string {
  const lang = useLanguageStore((s) => s.titleLanguage);
  if (lang === "native") return anime.title.native || anime.title.english || anime.title.romaji;
  if (lang === "romaji") return anime.title.romaji;
  return anime.title.english || anime.title.romaji;
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

const DETAIL_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  episodes
  duration
  status
  format
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  source
  studios(isMain: true) { nodes { name } }
  trailer { id site }
  characters(sort: ROLE, perPage: 12) {
    edges { role node { id name { full } image { large } } }
  }
  staff(sort: RELEVANCE, perPage: 12) {
    edges { role node { id name { full } image { large } } }
  }
  relations {
    edges {
      relationType(version: 2)
      node { id title { romaji english } coverImage { large } format }
    }
  }
  recommendations(sort: RATING_DESC, perPage: 12) {
    nodes { mediaRecommendation { ${FIELDS} } }
  }
  externalLinks { url site type color icon language }
`;

export async function getAnimeDetail(id: number): Promise<AnimeDetail | null> {
  const data = await gql<{ Media: AnimeDetail | null }>(`{
    Media(id: ${id}, type: ANIME) { ${DETAIL_FIELDS} }
  }`);
  return data.Media;
}

export const ANIME_GENRES = [
  "Action",
  "Fantasy",
  "Slice of Life",
  "Adventure",
  "Comedy",
  "Romance",
  "Drama",
  "Supernatural",
  "Sci-Fi",
  "Mystery",
  "Psychological",
  "Sports",
  "Horror",
  "Music",
  "Thriller",
  "Mecha",
];

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

// AniList's tag collection is large (400+) and static, so this is fetched once
// per revalidate window (same 1hr cache as everything else via gql()) and
// filtered to non-adult tags — this is a general-audience filter list, not an
// unfiltered dump of AniList's full taxonomy.
export async function getTagCollection(): Promise<string[]> {
  const data = await gql<{ MediaTagCollection: { name: string; isAdult: boolean }[] }>(
    `{ MediaTagCollection { name isAdult } }`
  );
  return data.MediaTagCollection.filter((t) => !t.isAdult)
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function browseAnime(filters: BrowseFilters): Promise<BrowsePage> {
  // AniList's resolver treats an explicitly-passed `null` filter argument as
  // "must equal null" rather than "no filter" — so unused filters must be
  // omitted from the variables object entirely, not set to null.
  const variables: Record<string, unknown> = {
    page: filters.page ?? 1,
    sort: [filters.sort ?? "TRENDING_DESC"],
  };
  if (filters.format) variables.format = filters.format;
  if (filters.status) variables.status = filters.status;
  if (filters.genre && filters.genre.length > 0) variables.genre = filters.genre;
  if (filters.tag && filters.tag.length > 0) variables.tag = filters.tag;
  if (filters.year) variables.seasonYear = filters.year;
  if (filters.search) variables.search = filters.search;

  const data = await gql<{ Page: { pageInfo: { hasNextPage: boolean }; media: AnimeMedia[] } }>(
    `query (
      $page: Int, $format: MediaFormat, $status: MediaStatus, $genre: [String],
      $tag: [String], $seasonYear: Int, $sort: [MediaSort], $search: String
    ) {
      Page(page: $page, perPage: 24) {
        pageInfo { hasNextPage }
        media(
          type: ANIME, format: $format, status: $status, genre_in: $genre,
          tag_in: $tag, seasonYear: $seasonYear, sort: $sort, search: $search
        ) { ${FIELDS} }
      }
    }`,
    variables
  );
  return { items: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
}
