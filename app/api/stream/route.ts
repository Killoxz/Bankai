import { NextResponse } from "next/server";
import { STREAMING_BASE } from "@/lib/streaming";

interface StreamEntry {
  url:      string;
  type?:    string;
  quality?: string;   // Miruro API: "1080p", "720p", etc.
  server?:  string;   // Anivexa API
  referer?: string;
  headers?: Record<string, string>;
  priority?: number;  // Anivexa API
  isActive?: boolean; // Anivexa API
}

interface WatchResponse {
  streams?:   StreamEntry[];
  subtitles?: { file: string; label?: string; kind?: string }[];
  intro?:     { start: number; end: number };
  outro?:     { start: number; end: number };
  downloads?: { url: string; label?: string }[];
  // legacy flat fields
  stream_url?: string;
  hls?:        string;
  url?:        string;
  streamUrl?:  string;
}

/**
 * Pick the best playable stream from the streams array.
 * Prefer: isActive=true → type=hls → highest priority.
 * Falls back to legacy flat fields if streams[] is absent.
 */
function pickStream(data: WatchResponse): { url: string; referer: string } | null {
  const streams = data.streams ?? [];

  // Miruro API: streams are pre-sorted by quality (1080p first), no isActive field.
  // Anivexa API: streams have isActive + priority flags.
  const hasActiveFlag = streams.some((s) => s.isActive !== undefined);

  const sorted = hasActiveFlag
    ? [...streams].sort((a, b) => {
        if ((b.isActive ? 1 : 0) !== (a.isActive ? 1 : 0))
          return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
        return (b.priority ?? 0) - (a.priority ?? 0);
      })
    : streams; // Miruro API: already in preferred order

  // Prefer HLS type; fall back to whatever is first
  const best =
    (hasActiveFlag
      ? sorted.find((s) => s.isActive && s.type === "hls") ?? sorted.find((s) => s.isActive)
      : null) ??
    sorted.find((s) => s.type === "hls") ??
    sorted[0];

  if (best?.url) {
    // Use the stream's explicit referer if provided, otherwise derive from its origin
    const referer =
      best.referer ??
      best.headers?.["Referer"] ??
      best.headers?.["referer"] ??
      (() => { try { return new URL(best.url).origin; } catch { return STREAMING_BASE; } })();
    return { url: best.url, referer };
  }

  // Legacy flat fields fallback
  const legacyUrl =
    (typeof data.stream_url === "string" && data.stream_url) ||
    (typeof data.hls        === "string" && data.hls)        ||
    (typeof data.url        === "string" && data.url)        ||
    (typeof data.streamUrl  === "string" && data.streamUrl)  ||
    null;

  if (legacyUrl) {
    let referer = STREAMING_BASE;
    try { referer = new URL(legacyUrl).origin; } catch {}
    return { url: legacyUrl, referer };
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Preferred: episode id taken directly from episodes response
  // e.g. "watch/reanime/16498/sub/reanime-1"
  const episodeId = searchParams.get("episodeId");

  // Legacy fallback
  const animeId  = searchParams.get("id");
  const episode  = searchParams.get("ep") ?? "1";
  const provider = searchParams.get("provider");
  const audio    = searchParams.get("audio") ?? "sub";

  let targetUrl: string;
  if (episodeId) {
    targetUrl = `${STREAMING_BASE}/${episodeId}`;
  } else if (provider && animeId) {
    targetUrl = `${STREAMING_BASE}/watch/${provider}/${animeId}/${audio}/${provider}-${episode}`;
  } else {
    return NextResponse.json(
      { error: "Missing episodeId (or id + provider) parameters." },
      { status: 400 }
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
        { status: upstream.status }
      );
    }

    const data = await upstream.json() as WatchResponse;
    const picked = pickStream(data);

    // Wrap the HLS URL through our proxy so HLS.js never hits CORS from the CDN.
    // Pass the stream's own referer so hotlink protection is satisfied.
    const proxiedUrl = picked
      ? `/api/hls?url=${encodeURIComponent(picked.url)}&ref=${encodeURIComponent(picked.referer)}`
      : null;

    return NextResponse.json({
      stream_url: proxiedUrl,
      subtitles:  data.subtitles ?? [],
      intro:      data.intro     ?? null,
      outro:      data.outro     ?? null,
    });
  } catch (err) {
    console.error("[stream proxy] error:", err);
    return NextResponse.json(
      { error: "Failed to reach the streaming backend." },
      { status: 502 }
    );
  }
}
