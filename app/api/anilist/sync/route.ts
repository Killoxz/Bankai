import { NextRequest, NextResponse } from "next/server";
import { prisma }          from "@/lib/prisma";
import { syncAniListList } from "@/lib/anilist-sync";

export async function POST(req: NextRequest) {
  const { username } = await req.json() as { username?: string };
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where:  { username: { equals: username, mode: "insensitive" } },
    select: { id: true, anilistId: true, anilistToken: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.anilistId || !user.anilistToken) {
    return NextResponse.json({ error: "AniList not connected" }, { status: 400 });
  }

  try {
    const count = await syncAniListList(user.id, user.anilistToken, user.anilistId);
    return NextResponse.json({ synced: count });
  } catch (err) {
    console.error("[anilist/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 502 });
  }
}
