import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";
import type { SessionMemory } from "@/lib/types";

// PATCH /api/memories/:memoryId
// Body: { status: "active" | "dismissed" }
// Lets the host dismiss (or reactivate) a session memory (issue 007). A
// dismissed memory is excluded from AI grounding. Realtime on session_memories
// delivers the change to the host dashboard.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  const { memoryId } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = body.status === "active" ? "active" : "dismissed";

  const supabase = getServiceSupabase();
  const { data: memory, error } = await supabase
    .from("session_memories")
    .update({ status })
    .eq("id", memoryId)
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!memory) {
    return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  }

  return NextResponse.json({ memory: memory as SessionMemory });
}
