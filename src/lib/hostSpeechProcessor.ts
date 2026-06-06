import "server-only";

import { getLineup, getRoomById } from "@/lib/rooms";
import { runHostSpeechAgent } from "@/lib/hostSpeechAgent";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { HostSpeech, SessionMemory } from "@/lib/types";

export interface HostSpeechProcessingResult {
  classification: string;
  hostSpeech: HostSpeech | null;
}

// Processes a transcribed host-speech segment (host-microphone feature).
//  - context     -> store as session memory so the AI can use it for grounding
//  - false_claim -> post a transparent AI correction in buyer chat AND flag the
//                   host with a policy-risk warning to clarify verbally
//  - chatter     -> logged only, no action
export async function processHostSpeech(
  roomId: string,
  transcript: string,
): Promise<HostSpeechProcessingResult | null> {
  const text = transcript.trim();
  if (!text) return null;

  const room = await getRoomById(roomId);
  if (!room || room.status !== "live") return null;

  const supabase = getServiceSupabase();
  const lineup = await getLineup(room.id);

  const { data: memoryRows } = await supabase
    .from("session_memories")
    .select("*")
    .eq("room_id", room.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const decision = await runHostSpeechAgent({
    room,
    transcript: text,
    lineup,
    sessionMemories: (memoryRows ?? []) as SessionMemory[],
  });

  // Always log the speech segment with its classification + compact note.
  const { data: speechRow } = await supabase
    .from("host_speech")
    .insert({
      room_id: room.id,
      transcript: text,
      classification: decision.classification,
      product_id: decision.productId,
      note: decision.note,
    })
    .select("*")
    .single();

  if (decision.classification === "context" && decision.memoryText) {
    // Learn it: store as stream-scoped session memory for higher-confidence
    // answers later. Does not mutate the seeded catalog.
    await supabase.from("session_memories").insert({
      room_id: room.id,
      memory_text: decision.memoryText,
      source_event: "host_speech",
      confidence: 0.75,
      status: "active",
    });
  } else if (decision.classification === "false_claim" && decision.correction) {
    // 1) Transparent AI correction in buyer chat.
    await supabase.from("comments").insert({
      room_id: room.id,
      sender_role: "assistant",
      buyer_display_name: null,
      body: decision.correction,
    });
    // 2) Flag the host with a policy-risk warning so they can clarify verbally.
    await supabase.from("ai_actions").insert({
      room_id: room.id,
      source_comment_id: null,
      action_type: "warn",
      product_id: decision.productId,
      confidence: null,
      buyer_message: decision.correction,
      host_summary: `Host said: "${text}". ${decision.note}`,
      rationale_label: "policy_risk:false_host_claim",
    });
  }

  return {
    classification: decision.classification,
    hostSpeech: (speechRow as HostSpeech) ?? null,
  };
}
