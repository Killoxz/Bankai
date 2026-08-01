import { NextResponse } from "next/server";

interface AniSkipResult {
  interval:      { startTime: number; endTime: number };
  skipType:      "op" | "ed" | "mixed-ed" | "mixed-op" | "recap";
  episodeLength: number;
}

interface AniSkipResponse {
  found:   boolean;
  results: AniSkipResult[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const malId  = searchParams.get("malId");
  const ep     = searchParams.get("ep") ?? "1";

  if (!malId || isNaN(Number(malId))) {
    return NextResponse.json({ intro: null, outro: null });
  }

  try {
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${ep}?types[]=op&types[]=ed&types[]=mixed-ed&types[]=mixed-op&episodeLength=0`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // cache per episode for 1 hour
    });

    if (!res.ok) return NextResponse.json({ intro: null, outro: null });

    const data = await res.json() as AniSkipResponse;
    if (!data.found || !data.results?.length) {
      return NextResponse.json({ intro: null, outro: null });
    }

    let intro: { start: number; end: number } | null = null;
    let outro: { start: number; end: number } | null = null;

    for (const r of data.results) {
      const seg = { start: r.interval.startTime, end: r.interval.endTime };
      if (r.skipType === "op" || r.skipType === "mixed-op") intro = seg;
      if (r.skipType === "ed" || r.skipType === "mixed-ed") outro = seg;
    }

    return NextResponse.json({ intro, outro });
  } catch {
    return NextResponse.json({ intro: null, outro: null });
  }
}
