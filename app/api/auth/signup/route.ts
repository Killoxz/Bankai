import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, username, password, avatar } = await req.json();

    const em = (email ?? "").trim().toLowerCase();
    const un = (username ?? "").trim();

    if (!em || !un || !password)
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (un.length < 2)
      return NextResponse.json({ error: "Username must be at least 2 characters." }, { status: 400 });
    if (un.length > 20)
      return NextResponse.json({ error: "Username must be 20 characters or less." }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: em }, { username: un }] },
      select: { email: true, username: true },
    });
    if (existing?.email === em)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    if (existing?.username?.toLowerCase() === un.toLowerCase())
      return NextResponse.json({ error: "This username is already taken." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: em,
        username: un,
        name: un,
        passwordHash,
        image: avatar ?? null,
      },
      select: { id: true, email: true, username: true, name: true, image: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "Sign-up failed. Please try again." }, { status: 500 });
  }
}
