import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio") as Blob | null;

  if (!audio || audio.size < 500) {
    return NextResponse.json({ error: "No audio data" }, { status: 400 });
  }

  const groqKey   = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return NextResponse.json(
      { error: "Add GROQ_API_KEY (or OPENAI_API_KEY) to enable AI CC." },
      { status: 501 },
    );
  }

  // Prefer Groq (faster + free tier); fall back to OpenAI
  const apiKey  = groqKey ?? openaiKey!;
  const isGroq  = !!groqKey;
  const baseUrl = isGroq
    ? "https://api.groq.com/openai/v1"
    : "https://api.openai.com/v1";
  const model   = isGroq ? "whisper-large-v3-turbo" : "whisper-1";

  const whisperForm = new FormData();
  whisperForm.append("file", audio, "chunk.webm");
  whisperForm.append("model", model);
  whisperForm.append("language", "en");
  whisperForm.append("response_format", "text");

  try {
    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body:    whisperForm,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.status.toString());
      console.error("[ai-captions] Whisper error:", detail);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const text = (await res.text()).trim();
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[ai-captions]", err);
    return NextResponse.json({ error: "Failed to transcribe" }, { status: 500 });
  }
}
