import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const { reviewId } = await params;
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { User: { select: { username: true } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (review.User.username?.toLowerCase() !== username.toLowerCase())
    return NextResponse.json({ error: "You can only delete your own review." }, { status: 403 });

  await prisma.review.delete({ where: { id: reviewId } });
  return NextResponse.json({ ok: true });
}
