import { NextResponse } from "next/server";
import { STREAMING_BASE } from "@/lib/streaming";

interface StreamEntry {
  url:       string;
  type?:     string;
  quality?:  string;
  server?:   string;
  referer?:  string;
  headers?:  Record<string, string>;
  priority?: number;
  isActive?: boolean;
  default?:  boolean;
}

interface InnerResponse {
  streams?:   StreamEntry[];
  subtitles?: { file: string; label?: string; kind?: string }[];
  intro?:     { start: number; end: number };
  outro?:     { start: number; end: number };
}

interface WatchResponse extends InnerResponse {
  // Anivexa-API wraps streams under ssub/sdub
  ssub?: InnerResponse;
  sdub?: InnerResponse;
  // legacy flat fields
  stream_url?: string;
  hls?:        string;
  url?:        string;
  streamUrl?:  string;
}

/**
 * Pick the best playable stream.
 * Prefers HLS over embed; uses priority/isActive flags when present.
 * Returns the stream URL and type so callers can decide whether to proxy it.
 */
function pickStream(data: InnerResponse): { url: string; referer: string; type: string } | null {
  const streams = data.streams ?? [];

  const hasActiveFlag = streams.some((s) => s.isActive !== undefined);

  const sorted = hasActiveFlag
    ? [...streams].sort((a, b) => {
        if ((b.isActive ? 1 : 0) !== (a.isActive ? 1 : 0))
          return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
        return (b.priority ?? 0) - (a.priority ?? 0);
      })
    : streams;

  // Prefer real HLS; fall back to whatever is first
  const best =
    (hasActiveFlag
      ? sorted.find((s) => s.isActive && s.type === "hls") ?? sorted.find((s) => s.isActive)
      : null) ??
    sorted.find((s) => s.type === "hls") ??
    sorted[0];

  if (best?.url) {
    const referer =
      best.referer ??
      best.headers?.["Referer"] ??
      best.headers?.["referer"] ??
      (() => { try { return new URL(best.url).origin; } catch { return STREAMING_BASE; } })();
    return { url: best.url, referer, type: best.type ?? "hls" };
  }

  return null;
}

function pickFromWatchResponse(data: WatchResponse, audio: string): {
  picked: ReturnType<typeof pickStream>;
  inner: InnerResponse;
} {
  // Anivexa-API wraps under ssub/sdub depending on audio track
  const innerKey = audio === "dub" ? "sdub" : "ssub";
  const inner: InnerResponse = (data as Record<string, InnerResponse>)[innerKey] ?? data;
  return { picked: pickStream(inner), inner };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const episodeId = searchParams.get("episodeId");
  const animeId   = searchParams.get("id");
  const episode   = searchParams.get("ep") ?? "1";
  const provider  = searchParams.get("provider");
  const audio     = searchParams.get("audio") ?? "sub";

  // Direct Anikoto path: episode ID is a megaplay embed URL — pass through to iframe player.
  if (episodeId && /^https?:\/\/megaplay\.buzz/i.test(episodeId)) {
    return NextResponse.json({ stream_url: episodeId, subtitles: [], intro: null, outro: null });
  }

  let targetUrl: string;
  if (episodeId) {
    targetUrl = `${STREAMING_BASE}/${episodeId}`;
  } else if (provider && animeId) {
    targetUrl = `${STREAMING_BASE}/watch/${provider}/${animeId}/${audio}/${provider}-${episode}`;
  } else {
    return NextResponse.json(
      { error: "Missing episodeId (or id + provider) parameters." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}.` },
        { status: upstream.status },
      );
    }

    const data = await upstream.json() as WatchResponse;
    const { picked, inner } = pickFromWatchResponse(data, audio);

    let streamUrl: string | null = null;
    if (picked) {
      // Embed URLs (type="embed", or megaplay/vidwish hosts) go straight to the iframe player.
      // HLS URLs are proxied through /api/hls to avoid CORS issues.
      const isEmbed =
        picked.type === "embed" ||
        /megaplay\.buzz|vidwish\.live/i.test(picked.url);

      streamUrl = isEmbed
        ? picked.url
        : `/api/hls?url=${encodeURIComponent(picked.url)}&ref=${encodeURIComponent(picked.referer)}`;
    }

    return NextResponse.json({
      stream_url: streamUrl,
      subtitles:  inner.subtitles ?? [],
      intro:      inner.intro     ?? null,
      outro:      inner.outro     ?? null,
    });
  } catch (err) {
    console.error("[stream proxy] error:", err);
    return NextResponse.json(
      { error: "Failed to reach the streaming backend." },
      { status: 502 },
    );
  }
}
