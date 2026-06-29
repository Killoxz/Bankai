import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/anime/:id/stream?ep=1&category=sub
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ep = Number(req.nextUrl.searchParams.get("ep") ?? "1");
  const category = (req.nextUrl.searchParams.get("category") ?? "sub") as "sub" | "dub";
  const server = req.nextUrl.searchParams.get("server") ?? undefined;
  try {
    const stream = await getProvider().getStream(decodeURIComponent(id), ep, category, server);
    if (!stream) return NextResponse.json({ error: "No stream available for this episode." }, { status: 404 });
    return NextResponse.json(stream);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load stream" },
      { status: 502 }
    );
  }
}
