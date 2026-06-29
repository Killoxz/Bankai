import type { AnimeCard, AnimeDetail } from "@/types/anime";

/** Project a full AnimeDetail down to the AnimeCard shape (for stores/actions). */
export function toCardFromDetail(d: AnimeDetail): AnimeCard {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    coverImage: d.coverImage,
    bannerImage: d.bannerImage,
    color: d.color,
    format: d.format,
    status: d.status,
    episodes: d.episodes,
    averageScore: d.averageScore,
    popularity: d.popularity,
    genres: d.genres,
    seasonYear: d.seasonYear,
    currentEpisode: d.currentEpisode,
  };
}
