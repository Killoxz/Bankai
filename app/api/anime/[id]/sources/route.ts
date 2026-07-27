import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAnimeCached } from "@/lib/ensure-anime";

const SOURCE_SELECT = {
  id: true,
  episode: true,
  url: true,
  label: true,
  createdAt: true,
  AddedBy: { select: { username: true } },
} as const;

function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const localId = `anilist:${id}`;

  const sources = await prisma.episodeSource.findMany({
    where: { animeId: localId },
    orderBy: [{ episode: "asc" }, { createdAt: "asc" }],
    select: SOURCE_SELECT,
  });

  return NextResponse.json({ sources });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anilistId = Number(id);
    const { username, episode, url, label } = await req.json();

    const un = (typeof username === "string" ? username : "").trim();
    if (!un) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    if (!Number.isInteger(episode) || episode < 1)
      return NextResponse.json({ error: "Episode must be a positive number." }, { status: 400 });
    if (typeof url !== "string" || !isSafeUrl(url))
      return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

    const localId = await ensureAnimeCached(anilistId);

    const source = await prisma.episodeSource.upsert({
      where: { animeId_episode_url: { animeId: localId, episode, url } },
      create: {
        animeId: localId,
        episode,
        url,
        label: typeof label === "string" && label.trim() ? label.trim().slice(0, 40) : null,
        addedById: user.id,
      },
      update: {},
      select: SOURCE_SELECT,
    });

    return NextResponse.json({ source });
  } catch (e) {
    console.error("source post error", e);
    return NextResponse.json({ error: "Couldn't save that source. Please try again." }, { status: 500 });
  }
}
