import { NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/genres
export async function GET() {
  try {
    const genres = await getProvider().getGenres();
    return NextResponse.json(genres);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load genres" },
      { status: 502 }
    );
  }
}
