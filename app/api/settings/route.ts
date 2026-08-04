import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ settings: null });

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { settings: true, updatedAt: true },
  });

  return NextResponse.json({
    settings:  user?.settings  ?? null,
    updatedAt: user?.updatedAt ?? null,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const { username, settings } = await req.json();
    const un = (typeof username === "string" ? username : "").trim();
    if (!un || !settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data:  { settings },
      select: { updatedAt: true },
    });

    return NextResponse.json({ ok: true, updatedAt: updated.updatedAt });
  } catch (e) {
    console.error("settings PUT error", e);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
