import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  const { sourceId } = await params;
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const source = await prisma.episodeSource.findUnique({
    where: { id: sourceId },
    select: { AddedBy: { select: { username: true } } },
  });
  if (!source) return NextResponse.json({ error: "Source not found." }, { status: 404 });
  if (source.AddedBy.username?.toLowerCase() !== username.toLowerCase())
    return NextResponse.json({ error: "You can only remove sources you added." }, { status: 403 });

  await prisma.episodeSource.delete({ where: { id: sourceId } });
  return NextResponse.json({ ok: true });
}
