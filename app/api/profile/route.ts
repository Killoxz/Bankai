import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ListStatus } from "@prisma/client";

const TRACKED_STATUSES: ListStatus[] = ["WATCHING", "PLAN_TO_WATCH", "COMPLETED"];

function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username)
    return NextResponse.json({ error: "Username is required." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      username: true,
      createdAt: true,
      image: true,
      banner: true,
      ListEntry: {
        where: { status: { in: TRACKED_STATUSES } },
        orderBy: { updatedAt: "desc" },
        select: {
          status: true,
          Anime: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverImage: true,
              seasonYear: true,
              genres: true,
              format: true,
            },
          },
        },
      },
    },
  });

  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const lists: Record<string, typeof user.ListEntry[number]["Anime"][]> = {
    watching: [],
    toWatch: [],
    watched: [],
  };
  const statusToKey: Record<string, keyof typeof lists> = {
    WATCHING: "watching",
    PLAN_TO_WATCH: "toWatch",
    COMPLETED: "watched",
  };
  for (const entry of user.ListEntry) {
    lists[statusToKey[entry.status]].push(entry.Anime);
  }

  return NextResponse.json({
    username: user.username,
    createdAt: user.createdAt,
    image: user.image,
    banner: user.banner,
    lists,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const { username, image, banner } = await req.json();

    const un = (typeof username === "string" ? username : "").trim();
    if (!un) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const data: { image?: string | null; banner?: string | null } = {};

    if (image !== undefined) {
      const v = typeof image === "string" ? image.trim() : "";
      if (v && !isSafeUrl(v))
        return NextResponse.json({ error: "Enter a valid http(s) profile picture URL." }, { status: 400 });
      data.image = v || null;
    }

    if (banner !== undefined) {
      const v = typeof banner === "string" ? banner.trim() : "";
      if (v && !isSafeUrl(v))
        return NextResponse.json({ error: "Enter a valid http(s) banner URL." }, { status: 400 });
      data.banner = v || null;
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { image: true, banner: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("profile patch error", e);
    return NextResponse.json({ error: "Couldn't save your profile. Please try again." }, { status: 500 });
  }
}
