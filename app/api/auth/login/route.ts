import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const em = (email ?? "").trim().toLowerCase();
    if (!em || !password)
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: em },
      select: { id: true, email: true, username: true, name: true, image: true, passwordHash: true, createdAt: true },
    });

    if (!user || !user.passwordHash)
      return NextResponse.json({ error: "No account found with this email." }, { status: 401 });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Sign-in failed. Please try again." }, { status: 500 });
  }
}
