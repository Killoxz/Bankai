import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No AssemblyAI key configured" }, { status: 501 });

  try {
    const res = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method:  "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body:    JSON.stringify({ expires_in: 480 }),
    });
    if (!res.ok) return NextResponse.json({ error: "Failed to get token" }, { status: 502 });
    const { token } = await res.json() as { token: string };
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Token request failed" }, { status: 500 });
  }
}
