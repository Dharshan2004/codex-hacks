"use client";

import { useCallback, useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Comment, SenderRole } from "@/lib/types";

export function createOptimisticComment({
  id,
  roomId,
  role,
  displayName,
  body,
  createdAt,
}: {
  id?: string;
  roomId: string;
  role: SenderRole;
  displayName?: string;
  body: string;
  createdAt?: string;
}): Comment {
  return {
    id:
      id ??
      `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    room_id: roomId,
    sender_role: role,
    buyer_display_name: role === "buyer" ? displayName || "Guest" : null,
    body,
    language_label: "en",
    moderation_status: "visible",
    ai_status: role === "buyer" ? "processing" : "none",
    reply_to_comment_id: null,
    created_at: createdAt ?? new Date().toISOString(),
  };
}

export function appendRoomComments(
  current: Comment[],
  incoming: Comment[],
): Comment[] {
  const byId = new Map(current.map((comment) => [comment.id, comment]));
  for (const comment of incoming) {
    if (comment.moderation_status !== "visible") {
      byId.delete(comment.id);
      continue;
    }
    byId.set(comment.id, comment);
  }
  return sortComments(Array.from(byId.values()));
}

export function replaceRoomComment(
  current: Comment[],
  commentId: string,
  replacement: Comment,
): Comment[] {
  const withoutOld = current.filter(
    (comment) => comment.id !== commentId && comment.id !== replacement.id,
  );
  return appendRoomComments(withoutOld, [replacement]);
}

export function removeRoomComment(
  current: Comment[],
  commentId: string,
): Comment[] {
  return current.filter((comment) => comment.id !== commentId);
}

function sortComments(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// Subscribes to a room's comments: loads the existing transcript, then keeps it
// live via Supabase Realtime. Optimistic helpers let local sender messages show
// immediately while the API/realtime round trip confirms the server row.
export function useRoomComments(roomId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );

  const addOptimisticComment = useCallback(
    ({
      role,
      displayName,
      body,
    }: {
      role: SenderRole;
      displayName?: string;
      body: string;
    }) => {
      const comment = createOptimisticComment({
        roomId,
        role,
        displayName,
        body,
      });
      setComments((prev) => appendRoomComments(prev, [comment]));
      return comment.id;
    },
    [roomId],
  );

  const confirmOptimisticComment = useCallback(
    (optimisticId: string, confirmed: Comment) => {
      setComments((prev) => replaceRoomComment(prev, optimisticId, confirmed));
    },
    [],
  );

  const rejectOptimisticComment = useCallback((optimisticId: string) => {
    setComments((prev) => removeRoomComment(prev, optimisticId));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const upsert = (incoming: Comment[]) => {
      setComments((prev) => appendRoomComments(prev, incoming));
    };

    (async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("room_id", roomId)
        .eq("moderation_status", "visible")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        return;
      }
      upsert((data ?? []) as Comment[]);
    })();

    const channel = supabase
      .channel(`comments:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          upsert([payload.new as Comment]);
        },
      )
      .subscribe((channelStatus) => {
        if (cancelled) return;
        if (channelStatus === "SUBSCRIBED") setStatus("live");
        else if (
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT"
        ) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return {
    comments,
    status,
    addOptimisticComment,
    confirmOptimisticComment,
    rejectOptimisticComment,
  };
}
