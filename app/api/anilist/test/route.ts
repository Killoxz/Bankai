import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where:  { username: { equals: username, mode: "insensitive" } },
    select: { anilistId: true, anilistUsername: true, anilistToken: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.anilistToken || !user.anilistId) {
    return NextResponse.json({ connected: false, reason: "No AniList token stored in DB" });
  }

  // Test the token with a live AniList API call
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.anilistToken}` },
      body:    JSON.stringify({ query: "{ Viewer { id name } }" }),
    });
    const json = await res.json() as { data?: { Viewer?: { id: number; name: string } }; errors?: { message: string }[] };

    if (json.errors?.length) {
      return NextResponse.json({ connected: false, reason: "Token invalid", errors: json.errors });
    }

    return NextResponse.json({
      connected:       true,
      storedUsername:  user.anilistUsername,
      storedId:        user.anilistId,
      liveViewer:      json.data?.Viewer,
      tokenWorks:      true,
    });
  } catch (err) {
    return NextResponse.json({ connected: false, reason: "AniList unreachable", error: String(err) });
  }
}
