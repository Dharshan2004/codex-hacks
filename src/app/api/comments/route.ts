import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";
import type { Comment, SenderRole } from "@/lib/types";

const MAX_BODY_LENGTH = 500;

// POST /api/comments
// Body: { roomId: string, body: string, displayName?: string, role?: SenderRole }
// Inserts a comment into a room. Realtime delivers it to host + buyer views.
export async function POST(request: Request) {
  let payload: {
    roomId?: string;
    body?: string;
    displayName?: string;
    role?: SenderRole;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const roomId = (payload.roomId || "").trim();
  const text = (payload.body || "").trim();
  const role: SenderRole = payload.role === "host" ? "host" : "buyer";

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Comment body is empty." }, { status: 400 });
  }
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Comment exceeds ${MAX_BODY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  // Ensure the room exists (and is live) before accepting comments.
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, status")
    .eq("id", roomId)
    .maybeSingle();
  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const displayName =
    role === "buyer" ? (payload.displayName || "Guest").slice(0, 40) : null;

  const { data: comment, error: insertError } = await supabase
    .from("comments")
    .insert({
      room_id: roomId,
      sender_role: role,
      buyer_display_name: displayName,
      body: text,
    })
    .select("*")
    .single();
  if (insertError || !comment) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to post comment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ comment: comment as Comment }, { status: 201 });
}
