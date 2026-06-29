import type {
  AnimeCard,
  AnimeDetail,
  AnimeQuery,
  Episode,
  Paginated,
  ScheduleItem,
  SearchResults,
  StreamData,
} from "@/types/anime";

export interface HomeSections {
  trending: AnimeCard[];
  popular: AnimeCard[];
  topRated: AnimeCard[];
  recentlyUpdated: AnimeCard[];
  upcoming: AnimeCard[];
  movies: AnimeCard[];
  tv: AnimeCard[];
}

/**
 * Every data source (mock, AniList, Jikan, …) implements this interface.
 * Swapping providers is a one-line config change — see services/providers/index.ts.
 */
export interface AnimeProvider {
  readonly name: string;

  /**
   * Optional batched fetch of all homepage rows in one round-trip.
   * Providers that can't batch simply omit this; callers fall back to the
   * individual section methods.
   */
  getHomeSections?(perPage?: number): Promise<HomeSections>;

  getTrending(query?: AnimeQuery): Promise<Paginated<AnimeCard>>;
  getPopular(query?: AnimeQuery): Promise<Paginated<AnimeCard>>;
  getTopRated(query?: AnimeQuery): Promise<Paginated<AnimeCard>>;
  getRecentlyUpdated(query?: AnimeQuery): Promise<Paginated<AnimeCard>>;
  getUpcoming(query?: AnimeQuery): Promise<Paginated<AnimeCard>>;
  getSeasonal(query?: AnimeQuery): Promise<Paginated<AnimeCard>>;

  /** Generic search/browse with filters + sorting (powers Trending page). */
  search(query: AnimeQuery): Promise<Paginated<AnimeCard>>;
  /** Lightweight instant-search for the command palette. */
  quickSearch(term: string): Promise<SearchResults>;

  getById(id: string): Promise<AnimeDetail | null>;
  getBySlug(slug: string): Promise<AnimeDetail | null>;
  getEpisodes(id: string): Promise<Episode[]>;
  getStream(id: string, episode: number, category?: "sub" | "dub", server?: string): Promise<StreamData | null>;

  getSchedule(weekday?: number): Promise<ScheduleItem[]>;
  getGenres(): Promise<string[]>;
}
