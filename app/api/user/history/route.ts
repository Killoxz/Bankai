import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// Persisted (cross-device) watch history. The client also keeps a local copy
// in Zustand; this endpoint is the source of truth for signed-in users.

const upsertSchema = z.object({
  anime: z.object({
    id: z.string(),
    title: z.object({ romaji: z.string() }),
    coverImage: z.string().optional().nullable(),
    bannerImage: z.string().optional().nullable(),
  }),
  episode: z.number().int().positive(),
  progress: z.number().int().nonnegative(),
  duration: z.number().int().nonnegative(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const history = await prisma.watchHistory.findMany({
    where: { userId: session.user.id },
    include: { anime: true },
    orderBy: { watchedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(history);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { anime, episode, progress, duration } = parsed.data;

  // Ensure the anime row exists (cached from the provider).
  await prisma.anime.upsert({
    where: { id: anime.id },
    create: {
      id: anime.id,
      slug: slugify(anime.title.romaji),
      title: anime.title.romaji,
      coverImage: anime.coverImage ?? null,
      bannerImage: anime.bannerImage ?? null,
      genres: [],
      studios: [],
    },
    update: {},
  });

  const entry = await prisma.watchHistory.upsert({
    where: {
      userId_animeId_episodeNumber: {
        userId: session.user.id,
        animeId: anime.id,
        episodeNumber: episode,
      },
    },
    create: {
      userId: session.user.id,
      animeId: anime.id,
      episodeNumber: episode,
      progress,
      duration,
      completed: duration > 0 && progress / duration > 0.9,
    },
    update: {
      progress,
      duration,
      completed: duration > 0 && progress / duration > 0.9,
      watchedAt: new Date(),
    },
  });

  return NextResponse.json(entry);
}
