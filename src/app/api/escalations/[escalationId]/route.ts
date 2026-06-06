import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";
import type { Escalation } from "@/lib/types";

// PATCH /api/escalations/:escalationId
// Body: { status?: "open" | "answered", hostAnswer?: string }
// Lets the host mark an escalation as answered/resolved (issue 006). When the
// host provides an answer, it is also posted into the live buyer chat as a host
// message linked to the buyer's original question. Realtime on `escalations`
// and `comments` delivers both to all views.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ escalationId: string }> },
) {
  const { escalationId } = await params;

  let body: { status?: string; hostAnswer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Default action is to resolve the escalation as answered.
  const status = body.status === "open" ? "open" : "answered";
  const hostAnswer = (body.hostAnswer ?? "").trim() || null;

  const update: Record<string, unknown> = {
    status,
    host_answer: hostAnswer,
    resolved_at: status === "answered" ? new Date().toISOString() : null,
  };

  const supabase = getServiceSupabase();
  const { data: escalation, error } = await supabase
    .from("escalations")
    .update(update)
    .eq("id", escalationId)
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!escalation) {
    return NextResponse.json(
      { error: "Escalation not found." },
      { status: 404 },
    );
  }

  const resolved = escalation as Escalation;

  // Post the host's answer to the live chat, linked to the buyer's question,
  // so buyers see the resolution without leaving chat (sender = host).
  if (status === "answered" && hostAnswer) {
    const { error: commentError } = await supabase.from("comments").insert({
      room_id: resolved.room_id,
      sender_role: "host",
      buyer_display_name: null,
      body: hostAnswer,
      reply_to_comment_id: resolved.source_comment_id,
    });
    if (commentError) {
      // The escalation is already resolved; surface the chat-post failure
      // without rolling back the resolution.
      return NextResponse.json(
        {
          escalation: resolved,
          warning: `Resolved, but failed to post to chat: ${commentError.message}`,
        },
        { status: 200 },
      );
    }

    // Auto-save the host's confirmed answer as session memory (issue 007), so
    // later similar buyer questions can be answered with higher confidence.
    // This is stream-scoped and never mutates the seeded catalog.
    await supabase.from("session_memories").insert({
      room_id: resolved.room_id,
      memory_text: hostAnswer,
      source_event: "host_answer",
      confidence: 0.9,
      status: "active",
    });
  }

  return NextResponse.json({ escalation: resolved });
}
