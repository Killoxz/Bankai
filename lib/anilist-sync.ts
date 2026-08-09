import { prisma } from "@/lib/prisma";
import type { ListStatus } from "@prisma/client";

const GQL = "https://graphql.anilist.co";

const LIST_QUERY = `
  query ($userId: Int) {
    MediaListCollection(userId: $userId, type: ANIME) {
      lists {
        entries {
          score(format: POINT_10)
          status
          media {
            id
            title { romaji english native }
            coverImage { large }
            bannerImage
            format
            status
            episodes
            seasonYear
            genres
          }
        }
      }
    }
  }
`;

function toListStatus(s: string): ListStatus | null {
  switch (s) {
    case "CURRENT":
    case "REPEATING":
      return "WATCHING";
    case "COMPLETED":
      return "COMPLETED";
    case "PLANNING":
      return "PLAN_TO_WATCH";
    case "DROPPED":
      return "DROPPED";
    case "PAUSED":
      return "ON_HOLD";
    default:
      return null;
  }
}

interface ALEntry {
  score: number | null;
  status: string;
  media: {
    id: number;
    title: { romaji: string | null; english: string | null; native: string | null };
    coverImage: { large: string | null };
    bannerImage: string | null;
    format: string | null;
    status: string | null;
    episodes: number | null;
    seasonYear: number | null;
    genres: string[];
  };
}

export async function syncAniListList(
  userId: string,
  token: string,
  anilistUserId: number,
): Promise<number> {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: LIST_QUERY, variables: { userId: anilistUserId } }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  const lists: { entries: ALEntry[] }[] = json.data?.MediaListCollection?.lists ?? [];
  const entries: ALEntry[] = lists.flatMap((l) => l.entries ?? []);

  let synced = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    const status = toListStatus(entry.status);
    if (!status) continue;

    const animeId = `anilist:${entry.media.id}`;
    const slug    = `anilist-${entry.media.id}`;
    const title   = entry.media.title.english ?? entry.media.title.romaji ?? `Anime ${entry.media.id}`;

    try {
      await prisma.anime.upsert({
        where:  { id: animeId },
        create: {
          id:         animeId,
          slug,
          title,
          titleNative: entry.media.title.native ?? null,
          coverImage:  entry.media.coverImage.large ?? null,
          bannerImage: entry.media.bannerImage ?? null,
          format:      entry.media.format ?? null,
          status:      entry.media.status ?? null,
          episodes:    entry.media.episodes ?? null,
          seasonYear:  entry.media.seasonYear ?? null,
          genres:      entry.media.genres ?? [],
        },
        update: {},
      });

      await prisma.listEntry.upsert({
        where:  { userId_animeId: { userId, animeId } },
        create: { userId, animeId, status, score: entry.score ? Math.round(entry.score) : null },
        update: { status, score: entry.score ? Math.round(entry.score) : null },
      });

      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${animeId}: ${msg}`);
      console.error("[anilist-sync] failed to sync entry", animeId, err);
    }
  }

  if (errors.length) {
    console.warn(`[anilist-sync] partial sync: ${synced} succeeded, ${errors.length} failed`);
  }

  return synced;
}
