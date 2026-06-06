import "server-only";

import { getLineup, getRoomById } from "@/lib/rooms";
import { getServiceSupabase } from "@/lib/supabase/server";
import { runStreamProducerAgent } from "@/lib/streamProducerAgent";
import type { AiAction, Comment, SessionMemory } from "@/lib/types";

export interface StreamProducerProcessingResult {
  decisionActionType: string;
  aiAction: AiAction | null;
  assistantComment: Comment | null;
}

export async function processNewBuyerComment(
  commentId: string,
): Promise<StreamProducerProcessingResult | null> {
  const supabase = getServiceSupabase();

  const { data: existingAction, error: existingActionError } = await supabase
    .from("ai_actions")
    .select("id")
    .eq("source_comment_id", commentId)
    .maybeSingle();
  if (existingActionError) {
    throw new Error(
      `Failed to check existing AI action: ${existingActionError.message}`,
    );
  }
  if (existingAction) return null;

  const { data: commentRow, error: commentError } = await supabase
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();
  if (commentError) {
    throw new Error(`Failed to load comment: ${commentError.message}`);
  }
  if (!commentRow) return null;

  const comment = commentRow as Comment;
  if (
    comment.sender_role !== "buyer" ||
    comment.moderation_status !== "visible"
  ) {
    return null;
  }

  const room = await getRoomById(comment.room_id);
  if (!room || room.status !== "live") return null;

  const lineup = await getLineup(room.id);
  const { data: memoryRows, error: memoryError } = await supabase
    .from("session_memories")
    .select("*")
    .eq("room_id", room.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (memoryError) {
    throw new Error(`Failed to load session memory: ${memoryError.message}`);
  }

  const decision = await runStreamProducerAgent({
    room,
    comment,
    lineup,
    sessionMemories: (memoryRows ?? []) as SessionMemory[],
  });

  if (decision.actionType !== "auto_reply") {
    return {
      decisionActionType: decision.actionType,
      aiAction: null,
      assistantComment: null,
    };
  }

  const { data: aiActionRow, error: aiActionError } = await supabase
    .from("ai_actions")
    .insert({
      room_id: room.id,
      source_comment_id: comment.id,
      action_type: "auto_reply",
      product_id: decision.productId,
      confidence: decision.confidence,
      buyer_message: decision.buyerMessage,
      host_summary: decision.hostSummary,
      rationale_label: decision.rationaleLabel,
    })
    .select("*")
    .single();
  if (aiActionError || !aiActionRow) {
    throw new Error(
      `Failed to store AI action: ${aiActionError?.message ?? "missing row"}`,
    );
  }

  const { data: assistantCommentRow, error: assistantCommentError } =
    await supabase
      .from("comments")
      .insert({
        room_id: room.id,
        sender_role: "assistant",
        buyer_display_name: null,
        body: decision.buyerMessage,
      })
      .select("*")
      .single();
  if (assistantCommentError || !assistantCommentRow) {
    throw new Error(
      `Failed to post AI assistant comment: ${
        assistantCommentError?.message ?? "missing row"
      }`,
    );
  }

  return {
    decisionActionType: decision.actionType,
    aiAction: aiActionRow as AiAction,
    assistantComment: assistantCommentRow as Comment,
  };
}
