import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ListStatus } from "@prisma/client";

const TRACKED_STATUSES: ListStatus[] = ["WATCHING", "PLAN_TO_WATCH", "COMPLETED"];

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username)
    return NextResponse.json({ error: "Username is required." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      username: true,
      createdAt: true,
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
    lists,
  });
}
