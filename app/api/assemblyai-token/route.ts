import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No AssemblyAI key configured" }, { status: 501 });

  try {
    // v3 token endpoint — returns a single-use token for the browser WebSocket connection
    const res = await fetch(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=480",
      {
        headers: { authorization: apiKey },
      },
    );
    if (!res.ok) return NextResponse.json({ error: "Failed to get token" }, { status: 502 });
    const { token } = await res.json() as { token: string };
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Token request failed" }, { status: 500 });
  }
}
