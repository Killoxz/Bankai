import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAnimeCached } from "@/lib/ensure-anime";

const COMMENT_SELECT = {
  id: true,
  body: true,
  parentId: true,
  createdAt: true,
  User: { select: { username: true } },
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const localId = `anilist:${id}`;

  const all = await prisma.comment.findMany({
    where: { animeId: localId },
    orderBy: { createdAt: "asc" },
    select: COMMENT_SELECT,
  });

  const topLevel = all.filter((c) => !c.parentId);
  const replies = all.filter((c) => c.parentId);
  const threaded = topLevel
    .map((c) => ({ ...c, replies: replies.filter((r) => r.parentId === c.id) }))
    .reverse(); // newest top-level comment first, replies stay chronological

  return NextResponse.json({ comments: threaded });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anilistId = Number(id);
    const { username, body, parentId } = await req.json();

    const un = (typeof username === "string" ? username : "").trim();
    if (!un) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    if (typeof body !== "string" || body.trim().length < 1)
      return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
    if (body.trim().length > 2000)
      return NextResponse.json({ error: "Comment is too long." }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

    const localId = await ensureAnimeCached(anilistId);

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { animeId: true } });
      if (!parent || parent.animeId !== localId)
        return NextResponse.json({ error: "Comment thread not found." }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        userId: user.id,
        animeId: localId,
        parentId: parentId ?? null,
        body: body.trim(),
      },
      select: COMMENT_SELECT,
    });

    return NextResponse.json({ comment });
  } catch (e) {
    console.error("comment post error", e);
    return NextResponse.json({ error: "Couldn't post your comment. Please try again." }, { status: 500 });
  }
}
