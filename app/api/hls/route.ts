import { NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function isM3U8(contentType: string, url: string) {
  return (
    contentType.includes("mpegurl") ||
    contentType.includes("x-mpegurl") ||
    url.includes(".m3u8")
  );
}

/**
 * Rewrite every URL inside an m3u8 playlist to route through this proxy.
 * This covers:
 *   - Segment lines (bare URLs / relative paths)
 *   - #EXT-X-KEY  URI="..."
 *   - #EXT-X-MAP  URI="..."
 *   - #EXT-X-MEDIA / #EXT-X-STREAM-INF URIs (for master playlists)
 */
function rewritePlaylist(text: string, originalUrl: string, proxyOrigin: string): string {
  const base = new URL(originalUrl);

  function toAbsolute(href: string): string {
    try { return new URL(href, base).href; } catch { return href; }
  }

  function proxyUrl(href: string): string {
    const abs = toAbsolute(href);
    return `${proxyOrigin}/api/hls?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(base.origin)}`;
  }

  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return line;

      // Rewrite URI="..." inside directives
      if (t.startsWith("#")) {
        return t.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${proxyUrl(uri)}"`);
      }

      // Bare segment / sub-playlist line
      return proxyUrl(t);
    })
    .join("\n");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const referer   = searchParams.get("ref") ?? "";

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Block requests that try to proxy something other than the streaming API
  // (basic SSRF guard — only allow http/https with a host)
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        "Accept": "*/*",
        "Referer": referer || `${parsed.origin}/`,
        "Origin": referer || parsed.origin,
      },
    });

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    const ct = upstream.headers.get("Content-Type") ?? "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    };

    if (isM3U8(ct, targetUrl)) {
      const text      = await upstream.text();
      const rewritten = rewritePlaylist(text, targetUrl, origin);
      return new Response(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
          ...corsHeaders,
        },
      });
    }

    // Stream everything else (segments, key files, etc.) directly —
    // no buffering so large .ts segments don't blow memory.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": ct || "application/octet-stream",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("[hls proxy]", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 502 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
