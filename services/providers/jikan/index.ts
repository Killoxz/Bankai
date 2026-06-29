import type { AnimeProvider } from "../types";
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
import { slugify, stripHtml } from "@/lib/utils";
import { MockProvider } from "../mock";

const BASE = "https://api.jikan.moe/v4";

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  return (await res.json()) as T;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCard(m: any): AnimeCard {
  return {
    id: `mal:${m.mal_id}`,
    slug: `${slugify(m.title ?? "anime")}-${m.mal_id}`,
    title: {
      romaji: m.title ?? m.title_english ?? "Untitled",
      english: m.title_english,
      native: m.title_japanese,
    },
    coverImage: m.images?.webp?.large_image_url ?? m.images?.jpg?.large_image_url ?? "",
    bannerImage: m.images?.jpg?.large_image_url,
    format: (m.type ?? "TV").toUpperCase().replace("TV SPECIAL", "SPECIAL"),
    status:
      m.status === "Currently Airing"
        ? "RELEASING"
        : m.status === "Not yet aired"
          ? "NOT_YET_RELEASED"
          : "FINISHED",
    episodes: m.episodes,
    averageScore: m.score ? Math.round(m.score * 10) : null,
    popularity: m.members,
    genres: (m.genres ?? []).map((g: any) => g.name),
    seasonYear: m.year ?? (m.aired?.from ? new Date(m.aired.from).getFullYear() : null),
    currentEpisode: null,
  };
}

export class JikanProvider implements AnimeProvider {
  readonly name = "jikan";
  private fallback = new MockProvider();

  private wrap(data: any, page: number): Paginated<AnimeCard> {
    return {
      items: (data.data ?? []).map(mapCard),
      page,
      hasNextPage: data.pagination?.has_next_page ?? false,
      total: data.pagination?.items?.total,
    };
  }

  async getTrending(q: AnimeQuery = {}) {
    return this.wrap(await jget(`/top/anime?filter=airing&page=${q.page ?? 1}`), q.page ?? 1);
  }
  async getPopular(q: AnimeQuery = {}) {
    return this.wrap(await jget(`/top/anime?filter=bypopularity&page=${q.page ?? 1}`), q.page ?? 1);
  }
  async getTopRated(q: AnimeQuery = {}) {
    return this.wrap(await jget(`/top/anime?page=${q.page ?? 1}`), q.page ?? 1);
  }
  async getRecentlyUpdated(q: AnimeQuery = {}) {
    return this.wrap(await jget(`/seasons/now?page=${q.page ?? 1}`), q.page ?? 1);
  }
  async getUpcoming(q: AnimeQuery = {}) {
    return this.wrap(await jget(`/seasons/upcoming?page=${q.page ?? 1}`), q.page ?? 1);
  }
  async getSeasonal(q: AnimeQuery = {}) {
    return this.wrap(await jget(`/seasons/now?page=${q.page ?? 1}`), q.page ?? 1);
  }

  async search(q: AnimeQuery) {
    const params = new URLSearchParams();
    if (q.search) params.set("q", q.search);
    if (q.genres?.length) params.set("genres", q.genres.join(","));
    params.set("page", String(q.page ?? 1));
    params.set("order_by", q.sort === "SCORE_DESC" ? "score" : "members");
    params.set("sort", "desc");
    return this.wrap(await jget(`/anime?${params.toString()}`), q.page ?? 1);
  }

  async quickSearch(term: string): Promise<SearchResults> {
    const data = await jget<any>(`/anime?q=${encodeURIComponent(term)}&limit=6`);
    return {
      anime: (data.data ?? []).map(mapCard),
      characters: [],
      staff: [],
      studios: [],
      genres: [],
    };
  }

  async getById(id: string): Promise<AnimeDetail | null> {
    const malId = id.replace("mal:", "");
    const data = await jget<any>(`/anime/${malId}/full`);
    const m = data.data;
    if (!m) return null;
    return {
      ...mapCard(m),
      description: stripHtml(m.synopsis),
      duration: m.duration ? parseInt(m.duration) || 24 : 24,
      season: m.season ? (m.season.toUpperCase() as any) : null,
      startDate: m.aired?.from ?? null,
      endDate: m.aired?.to ?? null,
      source: m.source,
      studios: (m.studios ?? []).map((s: any) => s.name),
      producers: (m.producers ?? []).map((p: any) => p.name),
      isAdult: m.rating?.includes("Hentai") ?? false,
      trailer: m.trailer?.youtube_id
        ? { id: m.trailer.youtube_id, site: "youtube", thumbnail: m.trailer.images?.maximum_image_url }
        : null,
      characters: [],
      relations: [],
      recommendations: [],
      stats: { rankPopularity: m.popularity, rankRated: m.rank, favourites: m.favorites },
      externalLinks: (m.external ?? []).map((e: any) => ({ site: e.name, url: e.url })),
    };
  }

  async getBySlug(slug: string): Promise<AnimeDetail | null> {
    const id = slug.split("-").pop();
    if (id && /^\d+$/.test(id)) return this.getById(`mal:${id}`);
    const data = await jget<any>(`/anime?q=${encodeURIComponent(slug.replace(/-/g, " "))}&limit=1`);
    const m = data.data?.[0];
    return m ? this.getById(`mal:${m.mal_id}`) : null;
  }

  async getEpisodes(id: string): Promise<Episode[]> {
    const malId = id.replace("mal:", "");
    try {
      const data = await jget<any>(`/anime/${malId}/episodes`);
      return (data.data ?? []).map((e: any) => ({
        id: `${id}:ep:${e.mal_id}`,
        number: e.mal_id,
        title: e.title,
        airDate: e.aired,
        isFiller: e.filler,
      }));
    } catch {
      return this.fallback.getEpisodes(id);
    }
  }

  getStream(id: string, episode: number, category: "sub" | "dub" = "sub"): Promise<StreamData> {
    return this.fallback.getStream(id, episode, category);
  }

  async getSchedule(weekday?: number): Promise<ScheduleItem[]> {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const day = weekday != null ? days[weekday] : days[new Date().getDay()];
    const data = await jget<any>(`/schedules?filter=${day}`);
    const now = Math.floor(Date.now() / 1000);
    return (data.data ?? []).map((m: any) => {
      const airingAt = m.aired?.from ? Math.floor(new Date(m.aired.from).getTime() / 1000) : now;
      return { anime: mapCard(m), episode: m.episodes ?? 1, airingAt, timeUntilAiring: airingAt - now };
    });
  }

  async getGenres(): Promise<string[]> {
    const data = await jget<any>(`/genres/anime`);
    return (data.data ?? []).map((g: any) => g.name);
  }
}
