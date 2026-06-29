import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// Persisted watchlist entries (status lists) for signed-in users.

const schema = z.object({
  anime: z.object({
    id: z.string(),
    title: z.object({ romaji: z.string() }),
    coverImage: z.string().optional().nullable(),
  }),
  status: z.enum(["WATCHING", "COMPLETED", "PLAN_TO_WATCH", "DROPPED", "ON_HOLD"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries = await prisma.listEntry.findMany({
    where: { userId: session.user.id },
    include: { anime: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { anime, status } = parsed.data;

  await prisma.anime.upsert({
    where: { id: anime.id },
    create: {
      id: anime.id,
      slug: slugify(anime.title.romaji),
      title: anime.title.romaji,
      coverImage: anime.coverImage ?? null,
      genres: [],
      studios: [],
    },
    update: {},
  });

  const entry = await prisma.listEntry.upsert({
    where: { userId_animeId: { userId: session.user.id, animeId: anime.id } },
    create: { userId: session.user.id, animeId: anime.id, status },
    update: { status },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const animeId = req.nextUrl.searchParams.get("animeId");
  if (!animeId) return NextResponse.json({ error: "animeId required" }, { status: 400 });
  await prisma.listEntry.deleteMany({ where: { userId: session.user.id, animeId } });
  return NextResponse.json({ ok: true });
}
