// Core domain types. Provider adapters normalize external API shapes into these.

export type AnimeFormat = "TV" | "MOVIE" | "OVA" | "SPECIAL" | "ONA" | "MUSIC";

export type AnimeStatus =
  | "RELEASING"
  | "FINISHED"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export type AnimeSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export interface Title {
  romaji: string;
  english?: string | null;
  native?: string | null;
}

export interface AnimeCard {
  id: string;
  slug: string;
  title: Title;
  coverImage: string;
  bannerImage?: string | null;
  color?: string | null;
  format?: AnimeFormat | null;
  status?: AnimeStatus | null;
  episodes?: number | null;
  averageScore?: number | null; // 0-100
  popularity?: number | null;
  genres: string[];
  seasonYear?: number | null;
  /** Episode number shown on a card overlay, when relevant (e.g. "EP 8"). */
  currentEpisode?: number | null;
}

export interface Character {
  id: string;
  name: string;
  image?: string | null;
  role?: string | null;
  voiceActor?: {
    id: string;
    name: string;
    image?: string | null;
    language?: string | null;
  } | null;
}

export interface RelatedAnime {
  id: string;
  slug: string;
  title: Title;
  coverImage: string;
  relationType?: string | null;
  format?: AnimeFormat | null;
}

export interface AnimeDetail extends AnimeCard {
  description?: string | null;
  duration?: number | null; // minutes
  season?: AnimeSeason | null;
  startDate?: string | null;
  endDate?: string | null;
  source?: string | null;
  studios: string[];
  producers: string[];
  isAdult?: boolean;
  trailer?: { id: string; site: string; thumbnail?: string | null } | null;
  characters: Character[];
  relations: RelatedAnime[];
  recommendations: AnimeCard[];
  /** ranking/stats summary */
  stats?: {
    rankPopularity?: number | null;
    rankRated?: number | null;
    favourites?: number | null;
  };
  externalLinks?: { site: string; url: string; icon?: string | null }[];
}

export interface Episode {
  id: string;
  number: number;
  title?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  airDate?: string | null;
  duration?: number | null;
  isFiller?: boolean;
}

export interface StreamSource {
  url: string;
  quality: string; // "1080p" | "720p" | "auto" ...
  isM3U8: boolean;
}

export interface StreamServer {
  name: string;
  category: "sub" | "dub";
}

export interface Subtitle {
  lang: string;
  url: string;
  default?: boolean;
}

export interface StreamData {
  sources: StreamSource[];
  subtitles: Subtitle[];
  intro?: { start: number; end: number } | null;
  outro?: { start: number; end: number } | null;
  headers?: Record<string, string>;
}

export interface ScheduleItem {
  anime: AnimeCard;
  episode: number;
  airingAt: number; // unix seconds
  timeUntilAiring: number; // seconds
}

export interface Paginated<T> {
  items: T[];
  page: number;
  hasNextPage: boolean;
  total?: number;
}

export interface AnimeQuery {
  search?: string;
  genres?: string[];
  format?: AnimeFormat;
  season?: AnimeSeason;
  seasonYear?: number;
  status?: AnimeStatus;
  sort?: AnimeSort;
  page?: number;
  perPage?: number;
}

export type AnimeSort =
  | "POPULARITY_DESC"
  | "TRENDING_DESC"
  | "SCORE_DESC"
  | "UPDATED_AT_DESC"
  | "START_DATE_DESC"
  | "TITLE_ROMAJI";

export interface SearchResults {
  anime: AnimeCard[];
  characters: { id: string; name: string; image?: string | null }[];
  studios: { id: string; name: string }[];
  staff: { id: string; name: string; image?: string | null }[];
  genres: string[];
}
