import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username)
    return NextResponse.json({ error: "Username required." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const history = await prisma.watchHistory.findMany({
    where: { userId: user.id },
    orderBy: { watchedAt: "desc" },
    take: 100,
    select: {
      id: true,
      animeId: true,
      episodeNumber: true,
      progress: true,
      duration: true,
      completed: true,
      watchedAt: true,
      episodeThumbnail: true,
      Anime: {
        select: {
          id: true,
          title: true,
          titleNative: true,
          coverImage: true,
          bannerImage: true,
          episodes: true,
          format: true,
          seasonYear: true,
          genres: true,
        },
      },
    },
  });

  return NextResponse.json({ history });
}

export async function POST(req: NextRequest) {
  try {
    const {
      username, animeId, episodeNumber, progress, duration, completed,
      episodeThumbnail, animeTitle, animeCover,
    } = await req.json();
    const un = (typeof username === "string" ? username : "").trim();
    const epNum  = typeof episodeNumber === "number" ? episodeNumber : Number(episodeNumber);
    const prog   = typeof progress  === "number" ? progress  : Number(progress  ?? 0);
    const dur    = typeof duration  === "number" ? duration  : Number(duration  ?? 0);
    if (!un || !animeId) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    if (!Number.isFinite(epNum) || epNum < 1 || !Number.isInteger(epNum))
      return NextResponse.json({ error: "Invalid episode number." }, { status: 400 });
    if (!Number.isFinite(prog) || prog < 0)
      return NextResponse.json({ error: "Invalid progress." }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Ensure the Anime row exists — WatchHistory has a required FK to Anime.
    // Use the animeId as both id and a URL-safe slug so the upsert always succeeds.
    const slug = String(animeId).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    await prisma.anime.upsert({
      where: { id: animeId },
      create: {
        id: animeId,
        slug,
        title: animeTitle || animeId,
        coverImage: animeCover || null,
      },
      update: {
        ...(animeTitle ? { title: animeTitle } : {}),
        ...(animeCover ? { coverImage: animeCover } : {}),
      },
    });

    const entry = await prisma.watchHistory.upsert({
      where: { userId_animeId_episodeNumber: { userId: user.id, animeId, episodeNumber: epNum } },
      create: {
        userId: user.id,
        animeId,
        episodeNumber: epNum,
        progress: prog,
        duration: Math.max(0, dur),
        completed: completed === true,
        watchedAt: new Date(),
        episodeThumbnail: episodeThumbnail ?? null,
      },
      update: {
        progress: prog,
        duration: Math.max(0, dur),
        completed: completed === true,
        watchedAt: new Date(),
        ...(episodeThumbnail ? { episodeThumbnail } : {}),
      },
    });

    return NextResponse.json({ entry });
  } catch (e) {
    console.error("history POST error", e);
    return NextResponse.json({ error: "Failed to save history." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  const animeId  = req.nextUrl.searchParams.get("animeId")?.trim();
  if (!username)
    return NextResponse.json({ error: "Username required." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (animeId) {
    await prisma.watchHistory.deleteMany({ where: { userId: user.id, animeId } });
  } else {
    await prisma.watchHistory.deleteMany({ where: { userId: user.id } });
  }
  return NextResponse.json({ ok: true });
}
