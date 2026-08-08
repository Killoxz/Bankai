import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: Request) {
  try {
    const { animeId, animeTitle, animeCover, episode, username } = await req.json() as {
      animeId: number; animeTitle: string; animeCover?: string; episode: number; username: string;
    };
    if (!animeId || !username) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const ex = await prisma.watchParty.findUnique({ where: { code } });
      if (!ex) break;
      code = genCode();
    }

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const party = await prisma.watchParty.create({
      data: { code, animeId, animeTitle, animeCover: animeCover ?? null, episode, currentTime: 0, isPlaying: false, hostName: username, memberNames: [username], expiresAt },
    });
    return NextResponse.json({ code: party.code });
  } catch (e) {
    console.error("[party/create]", e);
    return NextResponse.json({ error: "Failed to create party" }, { status: 500 });
  }
}
