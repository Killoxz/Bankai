import { NextResponse } from "next/server";
import { STREAMING_BASE } from "@/lib/streaming";

interface StreamEntry {
  url: string;
  type?: string;
  quality?: string;
}

interface WatchResponse {
  streams?:   StreamEntry[];
  subtitles?: { file: string; label?: string; kind?: string }[];
  intro?:     { start: number; end: number };
  outro?:     { start: number; end: number };
  // legacy fields
  stream_url?: string;
  hls?:        string;
  url?:        string;
  streamUrl?:  string;
}

function extractStreamUrl(data: WatchResponse): string | null {
  // New API: streams[]
  if (Array.isArray(data.streams) && data.streams.length > 0) {
    const s = data.streams[0];
    if (typeof s.url === "string" && s.url) return s.url;
  }
  // Legacy fields
  if (typeof data.stream_url === "string" && data.stream_url) return data.stream_url;
  if (typeof data.hls        === "string" && data.hls)        return data.hls;
  if (typeof data.url        === "string" && data.url)        return data.url;
  if (typeof data.streamUrl  === "string" && data.streamUrl)  return data.streamUrl;
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // New API: pass the episode's id field directly ("watch/kiwi/178005/sub/animepahe-1")
  const episodeId = searchParams.get("episodeId");

  // Legacy fallback params
  const animeId  = searchParams.get("id");
  const episode  = searchParams.get("ep") ?? "1";
  const provider = searchParams.get("provider");
  const audio    = searchParams.get("audio") ?? "sub";

  let targetUrl: string;
  if (episodeId) {
    // The episode id IS the watch path
    targetUrl = `${STREAMING_BASE}/${episodeId}`;
  } else if (provider && animeId) {
    // Legacy URL format
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
    const rawUrl = extractStreamUrl(data);

    // Wrap through HLS proxy so HLS.js never hits CORS from a CDN.
    let proxiedUrl: string | null = null;
    if (rawUrl) {
      let ref = STREAMING_BASE;
      try { ref = new URL(rawUrl).origin; } catch {}
      proxiedUrl = `/api/hls?url=${encodeURIComponent(rawUrl)}&ref=${encodeURIComponent(ref)}`;
    }

    return NextResponse.json({
      stream_url: proxiedUrl ?? null,
      streams:    data.streams   ?? [],
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
