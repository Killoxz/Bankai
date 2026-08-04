import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushProgressToAniList } from "@/lib/anilist-push";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anilistMediaId = Number(id);
    const { username, progress } = await req.json();

    if (!username || typeof progress !== "number" || progress < 1) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: username as string, mode: "insensitive" } },
      select: { anilistToken: true, anilistId: true },
    });

    if (!user?.anilistToken) {
      return NextResponse.json({ synced: false, reason: "no_anilist" });
    }

    await pushProgressToAniList(user.anilistToken, anilistMediaId, progress);
    return NextResponse.json({ synced: true, progress });
  } catch (e) {
    console.error("[anilist-progress]", e);
    return NextResponse.json({ synced: false, reason: "server_error" });
  }
}
