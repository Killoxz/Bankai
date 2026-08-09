import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getParty(code: string) {
  const party = await prisma.watchParty.findUnique({ where: { code: code.toUpperCase() } });
  if (!party) return null;
  if (new Date() > party.expiresAt) {
    await prisma.watchParty.delete({ where: { code: code.toUpperCase() } }).catch(() => {});
    return null;
  }
  return party;
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const party = await getParty(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });
  return NextResponse.json(party);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const party = await getParty(code);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    username?: string; episode?: number; currentTime?: number; isPlaying?: boolean; join?: boolean; leave?: boolean;
  };
  const { username, episode, currentTime, isPlaying, join, leave } = body;

  const data: Record<string, unknown> = {};

  if (join && username && !party.memberNames.includes(username)) {
    data.memberNames = [...party.memberNames, username];
  }
  if (leave && username) {
    data.memberNames = party.memberNames.filter((n: string) => n !== username);
  }
  if (username === party.hostName) {
    if (episode !== undefined) data.episode = episode;
    if (currentTime !== undefined) data.currentTime = currentTime;
    if (isPlaying !== undefined) data.isPlaying = isPlaying;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(party);
  }
  const updated = await prisma.watchParty.update({ where: { code: code.toUpperCase() }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const party = await getParty(code);
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { username } = await req.json() as { username: string };
  if (party.hostName !== username) return NextResponse.json({ error: "Only host can close" }, { status: 403 });
  await prisma.watchParty.delete({ where: { code: code.toUpperCase() } });
  return NextResponse.json({ ok: true });
}
