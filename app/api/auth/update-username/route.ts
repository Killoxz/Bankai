import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId, username } = await req.json();
    const un = (username ?? "").trim();

    if (!userId || !un)
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    if (un.length < 2)
      return NextResponse.json({ error: "Must be at least 2 characters." }, { status: 400 });
    if (un.length > 20)
      return NextResponse.json({ error: "Must be 20 characters or less." }, { status: 400 });

    const existing = await prisma.user.findUnique({
      where: { username: un },
      select: { id: true },
    });
    if (existing && existing.id !== userId)
      return NextResponse.json({ error: "This username is already taken." }, { status: 409 });

    await prisma.user.update({
      where: { id: userId },
      data: { username: un, name: un },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update-username error", e);
    return NextResponse.json({ error: "Failed to update username." }, { status: 500 });
  }
}
