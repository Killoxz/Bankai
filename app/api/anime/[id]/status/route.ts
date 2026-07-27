import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAnimeCached } from "@/lib/ensure-anime";
import type { ListStatus } from "@prisma/client";

const VALID_STATUSES: ListStatus[] = ["WATCHING", "PLAN_TO_WATCH", "COMPLETED", "DROPPED", "ON_HOLD"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ status: null });

  const localId = `anilist:${id}`;
  const entry = await prisma.listEntry.findFirst({
    where: {
      animeId: localId,
      User: { username: { equals: username, mode: "insensitive" } },
    },
    select: { status: true },
  });

  return NextResponse.json({ status: entry?.status ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anilistId = Number(id);
    const { username, status } = await req.json();

    const un = (typeof username === "string" ? username : "").trim();
    if (!un) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

    const localId = await ensureAnimeCached(anilistId);

    if (status === null) {
      await prisma.listEntry.deleteMany({ where: { userId: user.id, animeId: localId } });
      return NextResponse.json({ status: null });
    }

    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    await prisma.listEntry.upsert({
      where: { userId_animeId: { userId: user.id, animeId: localId } },
      create: { userId: user.id, animeId: localId, status },
      update: { status },
    });

    return NextResponse.json({ status });
  } catch (e) {
    console.error("status post error", e);
    return NextResponse.json({ error: "Couldn't update your list. Please try again." }, { status: 500 });
  }
}
