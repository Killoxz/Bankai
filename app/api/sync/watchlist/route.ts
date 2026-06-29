import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AnimeCard } from "@/types/anime";

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

// GET /api/sync/watchlist?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ entries: [], favorites: [] });

  try {
    const [listRows, favRows] = await Promise.all([
      prisma.listEntry.findMany({
        where: { userId },
        include: { anime: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.favorite.findMany({
        where: { userId },
        include: { anime: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const toCard = (a: typeof listRows[0]["anime"]): AnimeCard => ({
      id: a.id,
      slug: a.slug,
      title: { romaji: a.title, english: a.title, native: a.titleNative ?? null },
      coverImage: a.coverImage ?? "",
      bannerImage: a.bannerImage ?? null,
      format: a.format as any ?? null,
      status: a.status as any ?? null,
      episodes: a.episodes ?? null,
      averageScore: a.averageScore ?? null,
      popularity: a.popularity ?? null,
      genres: a.genres ?? [],
      seasonYear: a.seasonYear ?? null,
    });

    return NextResponse.json({
      entries: listRows.map((r) => ({
        anime: toCard(r.anime),
        status: r.status,
        score: r.score ?? undefined,
        folder: r.folder ?? undefined,
        addedAt: r.updatedAt.getTime(),
      })),
      favorites: favRows.map((r) => toCard(r.anime)),
    });
  } catch (e) {
    console.error("watchlist GET error", e);
    return NextResponse.json({ entries: [], favorites: [] });
  }
}

// POST /api/sync/watchlist  — upsert list entry or toggle favorite
// body: { userId, anime, action: "setStatus"|"toggleFavorite", status?, isFavorite? }
export async function POST(req: NextRequest) {
  try {
    const { userId, anime, action, status, isFavorite } = await req.json();
    if (!userId || !anime?.id) return NextResponse.json({ ok: false });

    await upsertAnime(anime);

    if (action === "setStatus" && status) {
      await prisma.listEntry.upsert({
        where: { userId_animeId: { userId, animeId: anime.id } },
        create: { userId, animeId: anime.id, status },
        update: { status },
      });
    } else if (action === "toggleFavorite") {
      if (isFavorite) {
        await prisma.favorite.deleteMany({ where: { userId, animeId: anime.id } });
      } else {
        await prisma.favorite.upsert({
          where: { userId_animeId: { userId, animeId: anime.id } },
          create: { userId, animeId: anime.id },
          update: {},
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("watchlist POST error", e);
    return NextResponse.json({ ok: false });
  }
}

// DELETE /api/sync/watchlist?userId=xxx&animeId=xxx
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const animeId = req.nextUrl.searchParams.get("animeId");
  if (!userId || !animeId) return NextResponse.json({ ok: false });

  try {
    await prisma.listEntry.deleteMany({ where: { userId, animeId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("watchlist DELETE error", e);
    return NextResponse.json({ ok: false });
  }
}
