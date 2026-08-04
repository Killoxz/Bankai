import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where:  { username: { equals: username, mode: "insensitive" } },
    select: { anilistId: true, anilistUsername: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    connected:        !!user.anilistId,
    anilistUsername:  user.anilistUsername ?? null,
    anilistId:        user.anilistId ?? null,
  });
}
