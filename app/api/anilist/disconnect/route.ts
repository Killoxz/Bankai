import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { username } = await req.json() as { username?: string };
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where:  { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data:  { anilistId: null, anilistUsername: null, anilistToken: null },
  });

  return NextResponse.json({ ok: true });
}
