// Client-side fetchers hitting our own Next route handlers.
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
import { animeQueryToParams } from "@/lib/query-params";

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  browse: (q: AnimeQuery) =>
    json<Paginated<AnimeCard>>(`/api/anime?${animeQueryToParams(q).toString()}`),
  detail: (id: string) => json<AnimeDetail>(`/api/anime/${encodeURIComponent(id)}`),
  episodes: (id: string) =>
    json<Episode[]>(`/api/anime/${encodeURIComponent(id)}/episodes`),
  stream: (id: string, ep: number, category: "sub" | "dub", server?: string) =>
    json<StreamData>(
      `/api/anime/${encodeURIComponent(id)}/stream?ep=${ep}&category=${category}${server ? `&server=${encodeURIComponent(server)}` : ""}`
    ),
  search: (q: string) =>
    json<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
  schedule: (weekday?: number) =>
    json<ScheduleItem[]>(
      `/api/schedule${weekday != null ? `?weekday=${weekday}` : ""}`
    ),
  genres: () => json<string[]>(`/api/genres`),
};
