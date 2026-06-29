import { NextRequest, NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

// Rewrite m3u8 segment/key URLs to go through our proxy, carrying the referer forward.
function rewriteM3u8(text: string, base: URL, ref: string): string {
  const refParam = ref ? `&ref=${encodeURIComponent(ref)}` : "";

  let out = text.replace(/URI="([^"]+)"/g, (_, uri) => {
    try {
      const abs = new URL(uri, base).toString();
      return `URI="/api/proxy/stream?url=${encodeURIComponent(abs)}${refParam}"`;
    } catch {
      return _;
    }
  });
  out = out.replace(/^(?!#)(\S+)$/gm, (line) => {
    try {
      const abs = new URL(line, base).toString();
      return `/api/proxy/stream?url=${encodeURIComponent(abs)}${refParam}`;
    } catch {
      return line;
    }
  });
  return out;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (url.protocol !== "https:") {
    return new NextResponse("Only HTTPS allowed", { status: 400 });
  }

  // Use the caller-supplied referer (from the stream's own `referer` field) so
  // CDNs that hotlink-protect their segments get the right header.
  // Fall back to the stream hostname when not supplied.
  const ref = req.nextUrl.searchParams.get("ref") ?? "";
  const refererHeader = ref || `https://${url.hostname}/`;
  const originHeader  = (() => {
    try { return new URL(refererHeader).origin; } catch { return `https://${url.hostname}`; }
  })();

  try {
    const upstream = await fetch(raw, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: refererHeader,
        Origin:  originHeader,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const ct = upstream.headers.get("content-type") ?? "";
    const isPlaylist = ct.includes("mpegurl") || raw.includes(".m3u8");

    const urlSuggestsText =
      raw.includes(".vtt") || raw.includes(".srt") ||
      raw.includes("subtitle") || raw.includes("caption") ||
      raw.includes("/sub/") || raw.includes("/subs/");

    const clearlyBinary =
      ct.startsWith("video/") || ct.startsWith("audio/") || ct.startsWith("image/");

    if (isPlaylist) {
      const text = await upstream.text();
      const rewritten = rewriteM3u8(text, url, ref);
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
          ...CORS,
        },
      });
    }

    if (!clearlyBinary && (urlSuggestsText || ct.includes("vtt") || ct.startsWith("text"))) {
      const text = await upstream.text();
      const trimmed = text.trimStart();

      if (trimmed.startsWith("WEBVTT") || (urlSuggestsText && trimmed.length > 0)) {
        const body = trimmed.startsWith("WEBVTT") ? text : `WEBVTT\n\n${text}`;
        return new NextResponse(body, {
          headers: {
            "Content-Type": "text/vtt; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            ...CORS,
          },
        });
      }

      return new NextResponse(text, {
        headers: {
          "Content-Type": ct || "text/plain",
          "Cache-Control": "public, max-age=3600",
          ...CORS,
        },
      });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": ct || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
        ...CORS,
      },
    });
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : "Proxy error",
      { status: 502 }
    );
  }
}
