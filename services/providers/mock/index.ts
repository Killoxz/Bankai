import type { AnimeProvider, HomeSections } from "../types";
import type {
  AnimeCard,
  AnimeQuery,
  Episode,
  Paginated,
  ScheduleItem,
  SearchResults,
  StreamData,
} from "@/types/anime";
import { MOCK_CARDS, MOCK_DETAILS, MOCK_GENRES } from "./data";

const PER_PAGE = 24;

function paginate<T>(items: T[], page = 1, perPage = PER_PAGE): Paginated<T> {
  const start = (page - 1) * perPage;
  const slice = items.slice(start, start + perPage);
  return {
    items: slice,
    page,
    hasNextPage: start + perPage < items.length,
    total: items.length,
  };
}

function applyFilters(cards: AnimeCard[], q: AnimeQuery = {}): AnimeCard[] {
  let out = [...cards];
  if (q.search) {
    const term = q.search.toLowerCase();
    out = out.filter(
      (c) =>
        c.title.romaji.toLowerCase().includes(term) ||
        c.title.english?.toLowerCase().includes(term) ||
        c.genres.some((g) => g.toLowerCase().includes(term))
    );
  }
  if (q.genres?.length)
    out = out.filter((c) => q.genres!.every((g) => c.genres.includes(g)));
  if (q.format) out = out.filter((c) => c.format === q.format);
  if (q.status) out = out.filter((c) => c.status === q.status);
  if (q.seasonYear) out = out.filter((c) => c.seasonYear === q.seasonYear);

  switch (q.sort) {
    case "SCORE_DESC":
      out.sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));
      break;
    case "TITLE_ROMAJI":
      out.sort((a, b) => a.title.romaji.localeCompare(b.title.romaji));
      break;
    case "START_DATE_DESC":
      out.sort((a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0));
      break;
    case "POPULARITY_DESC":
    case "TRENDING_DESC":
    default:
      out.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }
  return out;
}

// Pretend latency so loading skeletons are visible in the demo.
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export class MockProvider implements AnimeProvider {
  readonly name = "mock";

  async getHomeSections(perPage = 14): Promise<HomeSections> {
    await delay();
    const top = (q: AnimeQuery) => applyFilters(MOCK_CARDS, q).slice(0, perPage);
    return {
      trending: top({ sort: "TRENDING_DESC" }),
      popular: top({ sort: "POPULARITY_DESC" }),
      topRated: top({ sort: "SCORE_DESC" }),
      recentlyUpdated: MOCK_CARDS.filter((c) => c.status === "RELEASING").slice(0, perPage),
      upcoming: (() => {
        const u = MOCK_CARDS.filter((c) => c.status === "NOT_YET_RELEASED");
        return (u.length ? u : MOCK_CARDS).slice(0, perPage);
      })(),
      movies: top({ format: "MOVIE", sort: "POPULARITY_DESC" }),
      tv: top({ format: "TV", sort: "SCORE_DESC" }),
    };
  }

  async getTrending(q: AnimeQuery = {}) {
    await delay();
    return paginate(applyFilters(MOCK_CARDS, { ...q, sort: "TRENDING_DESC" }), q.page);
  }
  async getPopular(q: AnimeQuery = {}) {
    await delay();
    return paginate(applyFilters(MOCK_CARDS, { ...q, sort: "POPULARITY_DESC" }), q.page);
  }
  async getTopRated(q: AnimeQuery = {}) {
    await delay();
    return paginate(applyFilters(MOCK_CARDS, { ...q, sort: "SCORE_DESC" }), q.page);
  }
  async getRecentlyUpdated(q: AnimeQuery = {}) {
    await delay();
    const releasing = MOCK_CARDS.filter((c) => c.status === "RELEASING");
    return paginate(releasing, q.page);
  }
  async getUpcoming(q: AnimeQuery = {}) {
    await delay();
    const upcoming = MOCK_CARDS.filter((c) => c.status === "NOT_YET_RELEASED");
    return paginate(upcoming.length ? upcoming : MOCK_CARDS.slice(0, 6), q.page);
  }
  async getSeasonal(q: AnimeQuery = {}) {
    await delay();
    const year = q.seasonYear ?? 2024;
    return paginate(applyFilters(MOCK_CARDS, { ...q, seasonYear: year }), q.page);
  }

  async search(q: AnimeQuery) {
    await delay();
    return paginate(applyFilters(MOCK_CARDS, q), q.page ?? 1, q.perPage ?? PER_PAGE);
  }

  async quickSearch(term: string): Promise<SearchResults> {
    await delay(80);
    const t = term.toLowerCase();
    const anime = applyFilters(MOCK_CARDS, { search: term }).slice(0, 6);
    const matchedGenres = MOCK_GENRES.filter((g) => g.toLowerCase().includes(t)).slice(0, 5);
    const chars = MOCK_DETAILS.flatMap((d) => d.characters)
      .filter((c) => c.name.toLowerCase().includes(t))
      .slice(0, 4)
      .map((c) => ({ id: c.id, name: c.name, image: c.image }));
    const studios = Array.from(new Set(MOCK_DETAILS.flatMap((d) => d.studios)))
      .filter((s) => s.toLowerCase().includes(t))
      .slice(0, 4)
      .map((s, i) => ({ id: `studio:${i}`, name: s }));
    const staff = MOCK_DETAILS.flatMap((d) => d.characters.map((c) => c.voiceActor!))
      .filter((s) => s?.name.toLowerCase().includes(t))
      .slice(0, 4)
      .map((s) => ({ id: s.id, name: s.name, image: s.image }));
    return { anime, characters: chars, studios, staff, genres: matchedGenres };
  }

  async getById(id: string) {
    await delay();
    return MOCK_DETAILS.find((d) => d.id === id) ?? null;
  }
  async getBySlug(slug: string) {
    await delay();
    return MOCK_DETAILS.find((d) => d.slug === slug) ?? null;
  }

  async getEpisodes(id: string): Promise<Episode[]> {
    await delay();
    const anime = MOCK_DETAILS.find((d) => d.id === id);
    const count = anime?.episodes ?? 12;
    return Array.from({ length: count }, (_, i) => ({
      id: `${id}:ep:${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      description:
        "A pivotal turn raises the stakes for everyone involved as old alliances are tested.",
      thumbnail: `https://picsum.photos/seed/${encodeURIComponent(id)}-ep${i + 1}/320/180`,
      airDate: null,
      duration: (anime?.duration ?? 24) * 60,
      isFiller: (i + 1) % 7 === 0,
    }));
  }

  async getStream(
    _id: string,
    _episode: number,
    _category: "sub" | "dub" = "sub"
  ): Promise<StreamData> {
    await delay();
    // Public sample HLS stream so the player actually plays in the demo.
    return {
      sources: [
        {
          url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          quality: "auto",
          isM3U8: true,
        },
      ],
      subtitles: [
        {
          lang: "English",
          url: "https://raw.githubusercontent.com/mozilla/vtt.js/master/docs/examples/sample.vtt",
          default: true,
        },
      ],
      intro: { start: 5, end: 15 },
      outro: { start: 1320, end: 1380 },
    };
  }

  async getSchedule(weekday?: number): Promise<ScheduleItem[]> {
    await delay();
    const now = Math.floor(Date.now() / 1000);
    const releasing = MOCK_CARDS.filter((c) => c.status === "RELEASING");
    return releasing.map((anime, i) => {
      const dayOffset = weekday != null ? 0 : i % 7;
      const airingAt = now + dayOffset * 86400 + ((i * 3) % 22) * 3600 + 1800;
      return {
        anime,
        episode: (anime.currentEpisode ?? 1) + 1,
        airingAt,
        timeUntilAiring: airingAt - now,
      };
    });
  }

  async getGenres() {
    return MOCK_GENRES;
  }
}
