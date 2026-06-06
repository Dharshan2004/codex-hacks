import { after, NextResponse } from "next/server";

import { processHostSpeech } from "@/lib/hostSpeechProcessor";

const MAX_TRANSCRIPT_LENGTH = 1000;

// POST /api/host-speech
// Body: { roomId: string, transcript: string }
// Accepts a transcribed segment of the host's live speech and hands it to the
// Stream Producer DeepAgent (after the response) to learn context or flag a
// false claim. Returns immediately so the mic stream isn't blocked.
export async function POST(request: Request) {
  let payload: { roomId?: string; transcript?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const roomId = (payload.roomId || "").trim();
  const transcript = (payload.transcript || "").trim().slice(0, MAX_TRANSCRIPT_LENGTH);

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }
  if (!transcript) {
    return NextResponse.json({ error: "transcript is empty." }, { status: 400 });
  }

  after(async () => {
    try {
      await processHostSpeech(roomId, transcript);
    } catch (error) {
      console.error("Host speech processing failed", error);
    }
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
