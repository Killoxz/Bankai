import type { AnimeProvider } from "../types";
import type {
  AnimeCard,
  AnimeDetail,
  AnimeQuery,
  AnimeSort,
  Episode,
  Paginated,
  ScheduleItem,
  SearchResults,
  StreamData,
} from "@/types/anime";
import { slugify, stripHtml } from "@/lib/utils";
import { MockProvider } from "../mock";
import * as consumet from "@/services/consumet";
import type { HomeSections } from "../types";
import {
  DETAIL_QUERY,
  HOME_QUERY,
  PAGE_QUERY,
  SCHEDULE_QUERY,
  SEARCH_QUERY,
} from "./queries";

const ENDPOINT = "https://graphql.anilist.co";

const SORT_MAP: Record<AnimeSort, string[]> = {
  POPULARITY_DESC: ["POPULARITY_DESC"],
  TRENDING_DESC: ["TRENDING_DESC", "POPULARITY_DESC"],
  SCORE_DESC: ["SCORE_DESC"],
  UPDATED_AT_DESC: ["UPDATED_AT_DESC"],
  START_DATE_DESC: ["START_DATE_DESC"],
  TITLE_ROMAJI: ["TITLE_ROMAJI"],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 0
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    // Cache list/detail responses on the server for an hour.
    next: { revalidate: 3600 },
  });

  // Respect AniList rate limiting: back off and retry a couple of times.
  if (res.status === 429 && attempt < 3) {
    const retryAfter = Number(res.headers.get("Retry-After")) || 2 ** attempt;
    await sleep(Math.min(retryAfter, 5) * 1000);
    return gql<T>(query, variables, attempt + 1);
  }

  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json.data as T;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCard(m: any): AnimeCard {
  return {
    id: `anilist:${m.id}`,
    slug: `${slugify(m.title?.romaji ?? m.title?.english ?? String(m.id))}-${m.id}`,
    title: {
      romaji: m.title?.romaji ?? m.title?.english ?? "Untitled",
      english: m.title?.english,
      native: m.title?.native,
    },
    coverImage: m.coverImage?.extraLarge ?? m.coverImage?.large ?? "",
    bannerImage: m.bannerImage,
    color: m.coverImage?.color,
    format: m.format,
    status: m.status,
    episodes: m.episodes,
    averageScore: m.averageScore,
    popularity: m.popularity,
    genres: m.genres ?? [],
    seasonYear: m.seasonYear,
    currentEpisode: m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null,
  };
}

function mapDetail(m: any): AnimeDetail {
  const date = (d: any) =>
    d?.year ? `${d.year}-${String(d.month ?? 1).padStart(2, "0")}-${String(d.day ?? 1).padStart(2, "0")}` : null;
  return {
    ...mapCard(m),
    description: stripHtml(m.description),
    duration: m.duration,
    season: m.season,
    startDate: date(m.startDate),
    endDate: date(m.endDate),
    source: m.source,
    studios: (m.studios?.nodes ?? []).map((s: any) => s.name),
    producers: [],
    isAdult: m.isAdult,
    trailer: m.trailer
      ? { id: m.trailer.id, site: m.trailer.site, thumbnail: m.trailer.thumbnail }
      : null,
    characters: (m.characters?.edges ?? []).map((e: any) => ({
      id: String(e.node.id),
      name: e.node.name?.full,
      image: e.node.image?.large,
      role: e.role,
      voiceActor: e.voiceActors?.[0]
        ? {
            id: String(e.voiceActors[0].id),
            name: e.voiceActors[0].name?.full,
            image: e.voiceActors[0].image?.large,
            language: e.voiceActors[0].languageV2,
          }
        : null,
    })),
    relations: (m.relations?.edges ?? [])
      .filter((e: any) => e.node.type === "ANIME")
      .map((e: any) => ({
        id: `anilist:${e.node.id}`,
        slug: `${slugify(e.node.title?.romaji ?? "")}-${e.node.id}`,
        title: { romaji: e.node.title?.romaji, english: e.node.title?.english },
        coverImage: e.node.coverImage?.large,
        relationType: e.relationType,
        format: e.node.format,
      })),
    recommendations: (m.recommendations?.nodes ?? [])
      .filter((n: any) => n.mediaRecommendation)
      .map((n: any) => mapCard(n.mediaRecommendation)),
    stats: {
      rankPopularity: m.rankings?.find((r: any) => r.type === "POPULAR")?.rank,
      rankRated: m.rankings?.find((r: any) => r.type === "RATED")?.rank,
      favourites: m.favourites,
    },
    externalLinks: (m.externalLinks ?? []).map((l: any) => ({
      site: l.site,
      url: l.url,
      icon: l.icon,
    })),
  };
}

function toVars(q: AnimeQuery, defaultSort: AnimeSort) {
  return {
    page: q.page ?? 1,
    perPage: q.perPage ?? 24,
    sort: SORT_MAP[q.sort ?? defaultSort],
    search: q.search || undefined,
    genre_in: q.genres?.length ? q.genres : undefined,
    format: q.format || undefined,
    status: q.status || undefined,
    season: q.season || undefined,
    seasonYear: q.seasonYear || undefined,
  };
}

export class AniListProvider implements AnimeProvider {
  readonly name = "anilist";
  // AniList has no streams; delegate episode/stream playback to the mock provider.
  private fallback = new MockProvider();

  private async page(q: AnimeQuery, sort: AnimeSort): Promise<Paginated<AnimeCard>> {
    const data = await gql<any>(PAGE_QUERY, toVars(q, sort));
    return {
      items: data.Page.media.map(mapCard),
      page: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      total: data.Page.pageInfo.total,
    };
  }

  // One request for the whole homepage instead of 7.
  async getHomeSections(perPage = 14): Promise<HomeSections> {
    const data = await gql<Record<string, { media: unknown[] }>>(HOME_QUERY, { perPage });
    const map = (k: string) => (data[k]?.media ?? []).map(mapCard);
    return {
      trending: map("trending"),
      popular: map("popular"),
      topRated: map("topRated"),
      recentlyUpdated: map("recentlyUpdated"),
      upcoming: map("upcoming"),
      movies: map("movies"),
      tv: map("tv"),
    };
  }

  getTrending(q: AnimeQuery = {}) {
    return this.page(q, "TRENDING_DESC");
  }
  getPopular(q: AnimeQuery = {}) {
    return this.page(q, "POPULARITY_DESC");
  }
  getTopRated(q: AnimeQuery = {}) {
    return this.page(q, "SCORE_DESC");
  }
  getRecentlyUpdated(q: AnimeQuery = {}) {
    return this.page({ ...q, status: "RELEASING" }, "UPDATED_AT_DESC");
  }
  getUpcoming(q: AnimeQuery = {}) {
    return this.page({ ...q, status: "NOT_YET_RELEASED" }, "POPULARITY_DESC");
  }
  getSeasonal(q: AnimeQuery = {}) {
    return this.page(q, "POPULARITY_DESC");
  }
  search(q: AnimeQuery) {
    return this.page(q, q.sort ?? "POPULARITY_DESC");
  }

  async quickSearch(term: string): Promise<SearchResults> {
    const data = await gql<any>(SEARCH_QUERY, { search: term });
    return {
      anime: data.anime.media.map(mapCard),
      characters: data.characters.characters.map((c: any) => ({
        id: String(c.id),
        name: c.name.full,
        image: c.image?.large,
      })),
      staff: data.staff.staff.map((s: any) => ({
        id: String(s.id),
        name: s.name.full,
        image: s.image?.large,
      })),
      studios: data.studios.studios.map((s: any) => ({ id: String(s.id), name: s.name })),
      genres: [],
    };
  }

  async getById(id: string): Promise<AnimeDetail | null> {
    const numeric = Number(id.replace("anilist:", ""));
    if (!numeric) return null;
    const data = await gql<any>(DETAIL_QUERY, { id: numeric });
    return data.Media ? mapDetail(data.Media) : null;
  }

  async getBySlug(slug: string): Promise<AnimeDetail | null> {
    // Slugs end with the numeric AniList id: "title-12345".
    const id = slug.split("-").pop();
    if (id && /^\d+$/.test(id)) return this.getById(`anilist:${id}`);
    const data = await gql<any>(DETAIL_QUERY, { search: slug.replace(/-/g, " ") });
    return data.Media ? mapDetail(data.Media) : null;
  }

  async getEpisodes(id: string): Promise<Episode[]> {
    const detail = await this.getById(id);
    const title = detail?.title.english ?? detail?.title.romaji ?? "";
    const real = await consumet.getEpisodes(id, title);
    if (real && real.length > 0) return real;
    // Fallback: generate numbered stubs from AniList episode count.
    const count = detail?.episodes ?? 12;
    return Array.from({ length: count }, (_, i) => ({
      id: `${id}:ep:${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      thumbnail: detail?.bannerImage ?? detail?.coverImage,
      duration: (detail?.duration ?? 24) * 60,
    }));
  }

  async getStream(id: string, episode: number, category: "sub" | "dub" = "sub", server?: string): Promise<StreamData | null> {
    const detail = await this.getById(id);
    const title = detail?.title.english ?? detail?.title.romaji ?? "";
    return consumet.getStream(id, episode, category, title, undefined, server);
  }

  async getSchedule(): Promise<ScheduleItem[]> {
    const now = Math.floor(Date.now() / 1000);
    const data = await gql<any>(SCHEDULE_QUERY, {
      start: now,
      end: now + 7 * 86400,
      page: 1,
    });
    return data.Page.airingSchedules
      .filter((s: any) => s.media)
      .map((s: any) => ({
        anime: mapCard(s.media),
        episode: s.episode,
        airingAt: s.airingAt,
        timeUntilAiring: s.timeUntilAiring,
      }));
  }

  async getGenres(): Promise<string[]> {
    return [
      "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
      "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
      "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
    ];
  }
}
