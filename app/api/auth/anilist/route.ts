import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const clientId = process.env.ANILIST_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "AniList not configured" }, { status: 503 });

  const redirectUri = `${req.nextUrl.origin}/api/auth/anilist/callback`;
  const state = Buffer.from(JSON.stringify({ username, ts: Date.now() })).toString("base64url");

  const url = new URL("https://anilist.co/api/v2/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
