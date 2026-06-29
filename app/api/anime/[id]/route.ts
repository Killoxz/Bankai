import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/anime/:id → full anime detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const detail = await getProvider().getById(decodeURIComponent(id));
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load anime" },
      { status: 502 }
    );
  }
}
