import "server-only";

import { getLineup, getRoomById } from "@/lib/rooms";
import { getServiceSupabase } from "@/lib/supabase/server";
import { runStreamProducerAgent } from "@/lib/streamProducerAgent";
import type {
  AiAction,
  Comment,
  Escalation,
  SessionMemory,
} from "@/lib/types";

export interface StreamProducerProcessingResult {
  decisionActionType: string;
  aiAction: AiAction | null;
  assistantComment: Comment | null;
  escalation: Escalation | null;
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

  // From here the comment is a buyer comment marked "processing". Always flip it
  // to "done" when we finish — reply, ignore, escalate, or error — so the
  // "Agent answering…" indicator in the UI clears and never hangs.
  try {
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

    // Low-confidence-but-appropriate product questions become host escalations
    // (issue 006). We record the AI action and an escalation row, but never post
    // a buyer-facing assistant message — the host answers.
    if (decision.actionType === "escalate") {
      const { data: escalationActionRow, error: escalationActionError } =
        await supabase
          .from("ai_actions")
          .insert({
            room_id: room.id,
            source_comment_id: comment.id,
            action_type: "escalate",
            product_id: decision.productId,
            confidence: decision.confidence,
            buyer_message: null,
            host_summary: decision.hostSummary,
            rationale_label: decision.rationaleLabel,
          })
          .select("*")
          .single();
      if (escalationActionError || !escalationActionRow) {
        throw new Error(
          `Failed to store escalation AI action: ${
            escalationActionError?.message ?? "missing row"
          }`,
        );
      }

      const { data: escalationRow, error: escalationError } = await supabase
        .from("escalations")
        .insert({
          room_id: room.id,
          source_comment_id: comment.id,
          product_id: decision.productId,
          reason: decision.hostSummary,
          status: "open",
        })
        .select("*")
        .single();
      if (escalationError || !escalationRow) {
        throw new Error(
          `Failed to store escalation: ${
            escalationError?.message ?? "missing row"
          }`,
        );
      }

      return {
        decisionActionType: decision.actionType,
        aiAction: escalationActionRow as AiAction,
        assistantComment: null,
        escalation: escalationRow as Escalation,
      };
    }

    if (decision.actionType === "warn") {
      const { data: warnActionRow, error: warnActionError } = await supabase
        .from("ai_actions")
        .insert({
          room_id: room.id,
          source_comment_id: comment.id,
          action_type: "warn",
          product_id: decision.productId,
          confidence: decision.confidence,
          buyer_message: null,
          host_summary: decision.hostSummary,
          rationale_label: decision.rationaleLabel,
        })
        .select("*")
        .single();
      if (warnActionError || !warnActionRow) {
        throw new Error(
          `Failed to store warn AI action: ${
            warnActionError?.message ?? "missing row"
          }`,
        );
      }
      return {
        decisionActionType: decision.actionType,
        aiAction: warnActionRow as AiAction,
        assistantComment: null,
        escalation: null,
      };
    }

    // No-action comments (spam, chatter, unlinked, below-gate) are recorded as
    // low-priority "ignore" entries so the activity log (issue 010) can show
    // what the AI chose to skip, without posting anything buyer-facing.
    if (decision.actionType !== "auto_reply") {
      const { data: ignoreActionRow } = await supabase
        .from("ai_actions")
        .insert({
          room_id: room.id,
          source_comment_id: comment.id,
          action_type: "ignore",
          product_id: decision.productId,
          confidence: decision.confidence,
          buyer_message: null,
          host_summary: decision.hostSummary,
          rationale_label: decision.rationaleLabel,
        })
        .select("*")
        .single();
      return {
        decisionActionType: decision.actionType,
        aiAction: (ignoreActionRow as AiAction) ?? null,
        assistantComment: null,
        escalation: null,
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

    // The assistant reply is linked to the buyer comment it answers, so the
    // frontend can render the reply attached to that question.
    const { data: assistantCommentRow, error: assistantCommentError } =
      await supabase
        .from("comments")
        .insert({
          room_id: room.id,
          sender_role: "assistant",
          buyer_display_name: null,
          body: decision.buyerMessage,
          reply_to_comment_id: comment.id,
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
      escalation: null,
    };
  } finally {
    await markCommentAiDone(supabase, comment.id);
  }
}

// Flip a buyer comment's AI status to "done" so the "Agent answering…"
// indicator clears. Swallows its own errors so it never masks the real outcome.
async function markCommentAiDone(
  supabase: ReturnType<typeof getServiceSupabase>,
  commentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .update({ ai_status: "done" })
    .eq("id", commentId);
  if (error) {
    console.error("Failed to mark comment AI status done", error.message);
  }
}
