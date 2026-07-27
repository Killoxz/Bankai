import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const un = (typeof username === "string" ? username : "").trim();

    if (!un || typeof password !== "string" || !password)
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { username: true, passwordHash: true },
    });

    if (!user || !user.passwordHash)
      return NextResponse.json({ error: "No account found with that username." }, { status: 401 });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

    return NextResponse.json({ user: { username: user.username } });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Sign-in failed. Please try again." }, { status: 500 });
  }
}
