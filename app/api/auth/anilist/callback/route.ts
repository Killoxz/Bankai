import { NextRequest, NextResponse } from "next/server";
import { prisma }          from "@/lib/prisma";
import { syncAniListList } from "@/lib/anilist-sync";

const SETTINGS_REDIRECT = (origin: string, error?: string) =>
  `${origin}/settings?tab=connections${error ? `&error=${error}` : "&success=anilist"}`;

export async function GET(req: NextRequest) {
  const { origin } = req.nextUrl;
  const code     = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");

  if (!code || !stateRaw) {
    return NextResponse.redirect(SETTINGS_REDIRECT(origin, "cancelled"));
  }

  let username: string;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString()) as unknown;
    if (
      typeof state !== "object" || state === null ||
      typeof (state as Record<string, unknown>).username !== "string" ||
      typeof (state as Record<string, unknown>).ts !== "number"
    ) throw new Error("bad state");
    const { username: stateUsername, ts } = state as { username: string; ts: number };
    if (Date.now() - ts > 10 * 60 * 1000) throw new Error("expired");
    username = stateUsername;
  } catch {
    return NextResponse.redirect(SETTINGS_REDIRECT(origin, "invalid_state"));
  }

  const clientId     = process.env.ANILIST_CLIENT_ID;
  const clientSecret = process.env.ANILIST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(SETTINGS_REDIRECT(origin, "not_configured"));
  }

  // Exchange code for token
  const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body:    JSON.stringify({
      grant_type:    "authorization_code",
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  `${origin}/api/auth/anilist/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(SETTINGS_REDIRECT(origin, "token_exchange"));
  const tokenJson = await tokenRes.json() as { access_token?: unknown };
  const access_token = tokenJson.access_token;
  if (typeof access_token !== "string" || !access_token) {
    return NextResponse.redirect(SETTINGS_REDIRECT(origin, "token_exchange"));
  }

  // Get AniList viewer info
  const viewerRes = await fetch("https://graphql.anilist.co", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
    body:    JSON.stringify({ query: "{ Viewer { id name } }" }),
  });

  if (!viewerRes.ok) return NextResponse.redirect(SETTINGS_REDIRECT(origin, "viewer"));
  const { data } = await viewerRes.json() as { data: { Viewer: { id: number; name: string } | null } };
  const viewer = data?.Viewer;
  if (!viewer) return NextResponse.redirect(SETTINGS_REDIRECT(origin, "viewer"));

  // Find user in DB
  const user = await prisma.user.findFirst({
    where:  { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return NextResponse.redirect(SETTINGS_REDIRECT(origin, "user_not_found"));

  // Save AniList credentials
  await prisma.user.update({
    where: { id: user.id },
    data:  { anilistId: viewer.id, anilistUsername: viewer.name, anilistToken: access_token },
  });

  // Sync list (best-effort — don't block the redirect on failure)
  try {
    await syncAniListList(user.id, access_token, viewer.id);
  } catch (err) {
    console.error("[anilist-callback] sync failed:", err);
  }

  return NextResponse.redirect(SETTINGS_REDIRECT(origin));
}
