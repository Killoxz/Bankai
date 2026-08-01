import { NextResponse } from "next/server";

const STREAMING_BASE =
  (process.env.STREAMING_API_URL?.trim() ?? "https://bankai-s-api-production.up.railway.app")
    .replace(/\/$/, "")
    .replace(/^(?!https?:\/\/)/, "https://");

/** Normalise the many response shapes across Anivexa providers into one URL. */
function extractStreamUrl(data: Record<string, unknown>): string | null {
  if (typeof data.stream_url === "string") return data.stream_url;
  if (typeof data.hls === "string") return data.hls;
  if (typeof data.url === "string") return data.url;
  if (typeof data.streamUrl === "string") return data.streamUrl;
  const streams = data.streams;
  if (Array.isArray(streams) && streams.length > 0) {
    const first = streams[0] as Record<string, unknown>;
    if (typeof first.url === "string") return first.url;
    if (typeof first.hls === "string") return first.hls;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const animeId  = searchParams.get("id");
  const episode  = searchParams.get("ep") ?? "1";
  const provider = searchParams.get("provider");
  const audio    = searchParams.get("audio") ?? "sub";

  if (!animeId) {
    return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
  }

  // Anivexa API: /watch/:provider/:anilistId/sub|dub/:provider-:ep
  const targetUrl = provider
    ? `${STREAMING_BASE}/watch/${provider}/${animeId}/${audio}/${provider}-${episode}`
    : `${STREAMING_BASE}/api/watch/${animeId}?ep=${episode}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}.` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const streamUrl = extractStreamUrl(data as Record<string, unknown>);

    return NextResponse.json({ ...data, stream_url: streamUrl ?? data.stream_url ?? null });
  } catch (err) {
    console.error("[stream proxy] error:", err);
    return NextResponse.json(
      { error: "Failed to reach the streaming backend." },
      { status: 502 }
    );
  }
}
