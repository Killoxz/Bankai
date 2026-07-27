import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { User: { select: { username: true } } },
  });
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (comment.User.username?.toLowerCase() !== username.toLowerCase())
    return NextResponse.json({ error: "You can only delete your own comment." }, { status: 403 });

  // onDelete: Cascade on the parent self-relation removes any replies too.
  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
