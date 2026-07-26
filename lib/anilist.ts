const GQL = "https://graphql.anilist.co";

export interface AnimeMedia {
  id: number;
  title: { romaji: string; english: string | null };
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
  title { romaji english }
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

async function gql(query: string): Promise<Record<string, { media: AnimeMedia[] }>> {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 3600 },
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json.data;
}

export async function getHomeData() {
  const data = await gql(`{
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
  }`);

  const trending = data.trending.media;
  const popular = data.popular.media;
  const topRated = data.topRated.media;
  const newSeason = data.newSeason.media;

  // Pick hero: first trending anime that has a banner image
  const hero = trending.find((m) => m.bannerImage) ?? trending[0];

  return { hero, trending, popular, topRated, newSeason };
}

export function preferredTitle(anime: AnimeMedia): string {
  return anime.title.english || anime.title.romaji;
}
