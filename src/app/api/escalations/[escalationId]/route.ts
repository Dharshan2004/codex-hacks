import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";
import type { Escalation } from "@/lib/types";

// PATCH /api/escalations/:escalationId
// Body: { status?: "open" | "answered", hostAnswer?: string }
// Lets the host mark an escalation as answered/resolved (issue 006). Realtime on
// `escalations` delivers the change to the host dashboard.
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

  return NextResponse.json({ escalation: escalation as Escalation });
}
