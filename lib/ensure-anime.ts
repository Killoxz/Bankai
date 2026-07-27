import { prisma } from "@/lib/prisma";

const GQL = "https://graphql.anilist.co";

interface CacheFields {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  bannerImage: string | null;
  format: string | null;
  status: string | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  genres: string[];
  studios: { nodes: { name: string }[] };
}

/**
 * Ensures a row exists in the local Anime cache table for the given AniList
 * numeric id, fetching minimal display fields from AniList if it doesn't.
 * Returns the local Anime.id ("anilist:<id>") so callers can attach
 * ListEntry/Review/Favorite rows to it.
 */
export async function ensureAnimeCached(anilistId: number): Promise<string> {
  const localId = `anilist:${anilistId}`;
  const existing = await prisma.anime.findUnique({ where: { id: localId }, select: { id: true } });
  if (existing) return localId;

  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query ($id: Int) { Media(id: $id, type: ANIME) {
        id title { romaji english } coverImage { large } bannerImage format status
        seasonYear episodes duration averageScore genres studios(isMain: true) { nodes { name } }
      } }`,
      variables: { id: anilistId },
    }),
  });
  const json = await res.json();
  const media: CacheFields | null = json.data?.Media ?? null;
  if (!media) throw new Error("Anime not found on AniList.");

  await prisma.anime.upsert({
    where: { id: localId },
    create: {
      id: localId,
      slug: `anilist-${anilistId}`,
      title: media.title.english || media.title.romaji,
      coverImage: media.coverImage.large,
      bannerImage: media.bannerImage,
      format: media.format,
      status: media.status,
      seasonYear: media.seasonYear,
      episodes: media.episodes,
      duration: media.duration,
      averageScore: media.averageScore,
      genres: media.genres,
      studios: media.studios.nodes.map((s) => s.name),
    },
    update: {},
  });

  return localId;
}
