import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AnimeCard } from "@/types/anime";

// Upsert the Anime row so WatchHistory FK is satisfied
async function upsertAnime(anime: AnimeCard) {
  await prisma.anime.upsert({
    where: { id: anime.id },
    create: {
      id: anime.id,
      slug: anime.slug,
      title: anime.title.romaji ?? anime.title.english ?? anime.id,
      titleNative: anime.title.native ?? null,
      coverImage: anime.coverImage ?? null,
      bannerImage: anime.bannerImage ?? null,
      format: anime.format ?? null,
      status: anime.status ?? null,
      episodes: anime.episodes ?? null,
      averageScore: anime.averageScore ?? null,
      popularity: anime.popularity ?? null,
      genres: anime.genres ?? [],
      studios: [],
      seasonYear: anime.seasonYear ?? null,
    },
    update: {
      title: anime.title.romaji ?? anime.title.english ?? anime.id,
      coverImage: anime.coverImage ?? null,
    },
  });
}

// GET /api/sync/history?userId=xxx  — load all history for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ entries: [] });

  try {
    const rows = await prisma.watchHistory.findMany({
      where: { userId },
      include: { anime: true },
      orderBy: { watchedAt: "desc" },
      distinct: ["animeId"],
      take: 100,
    });

    const entries = rows.map((r) => ({
      anime: {
        id: r.anime.id,
        slug: r.anime.slug,
        title: {
          romaji: r.anime.title,
          english: r.anime.title,
          native: r.anime.titleNative ?? null,
        },
        coverImage: r.anime.coverImage ?? "",
        bannerImage: r.anime.bannerImage ?? null,
        format: r.anime.format as any ?? null,
        status: r.anime.status as any ?? null,
        episodes: r.anime.episodes ?? null,
        averageScore: r.anime.averageScore ?? null,
        popularity: r.anime.popularity ?? null,
        genres: r.anime.genres ?? [],
        seasonYear: r.anime.seasonYear ?? null,
      },
      episode: r.episodeNumber,
      progress: r.progress,
      duration: r.duration,
      updatedAt: r.watchedAt.getTime(),
      episodeThumbnail: null,
    }));

    return NextResponse.json({ entries });
  } catch (e) {
    console.error("history GET error", e);
    return NextResponse.json({ entries: [] });
  }
}

// POST /api/sync/history  — upsert one entry
export async function POST(req: NextRequest) {
  try {
    const { userId, anime, episode, progress, duration } = await req.json();
    if (!userId || !anime?.id) return NextResponse.json({ ok: false });

    await upsertAnime(anime);
    await prisma.watchHistory.upsert({
      where: { userId_animeId_episodeNumber: { userId, animeId: anime.id, episodeNumber: episode } },
      create: {
        userId,
        animeId: anime.id,
        episodeNumber: episode,
        progress: Math.round(progress),
        duration: Math.round(duration),
        completed: duration > 0 && progress / duration > 0.9,
      },
      update: {
        progress: Math.round(progress),
        duration: Math.round(duration),
        completed: duration > 0 && progress / duration > 0.9,
        watchedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("history POST error", e);
    return NextResponse.json({ ok: false });
  }
}

// DELETE /api/sync/history?userId=xxx&animeId=xxx
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const animeId = req.nextUrl.searchParams.get("animeId");
  if (!userId || !animeId) return NextResponse.json({ ok: false });

  try {
    await prisma.watchHistory.deleteMany({ where: { userId, animeId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("history DELETE error", e);
    return NextResponse.json({ ok: false });
  }
}
