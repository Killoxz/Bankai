"use client";

import {
  useInfiniteQuery,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/services/client";
import type { AnimeQuery } from "@/types/anime";

export const animeKeys = {
  browse: (q: AnimeQuery) => ["anime", "browse", q] as const,
  detail: (id: string) => ["anime", "detail", id] as const,
  episodes: (id: string) => ["anime", "episodes", id] as const,
  stream: (id: string, ep: number, cat: string, server?: string) =>
    ["anime", "stream", id, ep, cat, server ?? ""] as const,
  search: (q: string) => ["search", q] as const,
  schedule: (wd?: number) => ["schedule", wd] as const,
  genres: () => ["genres"] as const,
};

/** Infinite browse — powers the Trending page grid. */
export function useBrowse(query: AnimeQuery) {
  return useInfiniteQuery({
    queryKey: animeKeys.browse(query),
    queryFn: ({ pageParam }) => api.browse({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useAnimeDetail(id: string) {
  return useQuery({
    queryKey: animeKeys.detail(id),
    queryFn: () => api.detail(id),
    enabled: !!id,
  });
}

export function useEpisodes(id: string) {
  return useQuery({
    queryKey: animeKeys.episodes(id),
    queryFn: () => api.episodes(id),
    enabled: !!id,
  });
}

export function useStream(
  id: string,
  episode: number,
  category: "sub" | "dub",
  server?: string
) {
  return useQuery({
    queryKey: animeKeys.stream(id, episode, category, server),
    queryFn: () => api.stream(id, episode, category, server),
    enabled: !!id && episode > 0,
  });
}

export function useSearch(term: string) {
  return useQuery({
    queryKey: animeKeys.search(term),
    queryFn: () => api.search(term),
    enabled: term.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useSchedule(weekday?: number) {
  return useQuery({
    queryKey: animeKeys.schedule(weekday),
    queryFn: () => api.schedule(weekday),
  });
}

export function useGenres() {
  return useQuery({
    queryKey: animeKeys.genres(),
    queryFn: () => api.genres(),
    staleTime: 60 * 60 * 1000,
  });
}
