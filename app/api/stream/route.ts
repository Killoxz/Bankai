import { NextResponse } from "next/server";

const STREAMING_BASE =
  process.env.STREAMING_API_URL?.replace(/\/$/, "") ??
  "https://bankai-api-production.up.railway.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const animeId = searchParams.get("id");
  const episode = searchParams.get("ep") ?? "1";
  const path = (searchParams.get("path") ?? "/api/watch/").replace(/\/$/, "");

  if (!animeId) {
    return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
  }

  const targetUrl = `${STREAMING_BASE}${path}/${animeId}?ep=${episode}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}.` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[stream proxy] error:", err);
    return NextResponse.json(
      { error: "Failed to reach the streaming backend." },
      { status: 502 }
    );
  }
}
