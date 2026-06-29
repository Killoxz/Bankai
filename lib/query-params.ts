import type { AnimeQuery, AnimeSort } from "@/types/anime";

const SORTS: AnimeSort[] = [
  "POPULARITY_DESC",
  "TRENDING_DESC",
  "SCORE_DESC",
  "UPDATED_AT_DESC",
  "START_DATE_DESC",
  "TITLE_ROMAJI",
];

/** Parse an AnimeQuery from URLSearchParams (route handlers + client links). */
export function parseAnimeQuery(sp: URLSearchParams): AnimeQuery {
  const num = (k: string) => {
    const v = sp.get(k);
    return v ? Number(v) : undefined;
  };
  const sort = sp.get("sort") as AnimeSort | null;
  return {
    search: sp.get("search") ?? undefined,
    genres: sp.getAll("genre").length ? sp.getAll("genre") : undefined,
    format: (sp.get("format") as AnimeQuery["format"]) ?? undefined,
    status: (sp.get("status") as AnimeQuery["status"]) ?? undefined,
    season: (sp.get("season") as AnimeQuery["season"]) ?? undefined,
    seasonYear: num("seasonYear"),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: num("page") ?? 1,
    perPage: num("perPage"),
  };
}

export function animeQueryToParams(q: AnimeQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.search) sp.set("search", q.search);
  q.genres?.forEach((g) => sp.append("genre", g));
  if (q.format) sp.set("format", q.format);
  if (q.status) sp.set("status", q.status);
  if (q.season) sp.set("season", q.season);
  if (q.seasonYear) sp.set("seasonYear", String(q.seasonYear));
  if (q.sort) sp.set("sort", q.sort);
  if (q.page) sp.set("page", String(q.page));
  if (q.perPage) sp.set("perPage", String(q.perPage));
  return sp;
}
