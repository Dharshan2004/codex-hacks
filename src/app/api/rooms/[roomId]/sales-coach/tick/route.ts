import { NextResponse } from "next/server";

import { maybeCreateSalesCoachPromptForTimer } from "@/lib/salesCoachPrompts";

// POST /api/rooms/:roomId/sales-coach/tick
// Lets the host console ask the server for a timer-based coaching cue. The
// engine handles interval gating, so repeated calls are safe.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  try {
    const prompt = await maybeCreateSalesCoachPromptForTimer(roomId);
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create sales coach prompt.",
      },
      { status: 500 },
    );
  }
}
