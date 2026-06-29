import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/services/providers";

// GET /api/schedule?weekday=0..6
export async function GET(req: NextRequest) {
  const wd = req.nextUrl.searchParams.get("weekday");
  const weekday = wd != null ? Number(wd) : undefined;
  try {
    const schedule = await getProvider().getSchedule(weekday);
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load schedule" },
      { status: 502 }
    );
  }
}
