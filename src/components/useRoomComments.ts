"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    created_at: createdAt ?? new Date().toISOString(),
  };
}

export function appendRoomComments(
  current: Comment[],
  incoming: Comment[],
): Comment[] {
  const seen = new Set(current.map((comment) => comment.id));
  const next = [...current];
  for (const comment of incoming) {
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);
    next.push(comment);
  }
  return sortComments(next);
}

export function replaceRoomComment(
  current: Comment[],
  commentId: string,
  replacement: Comment,
): Comment[] {
  const replaced = current.map((comment) =>
    comment.id === commentId ? replacement : comment,
  );
  return appendRoomComments(
    replaced.filter(
      (comment, index, all) =>
        all.findIndex((candidate) => candidate.id === comment.id) === index,
    ),
    [],
  );
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

// Subscribes to a room's comments: loads the existing transcript, then appends
// new rows via Supabase Realtime. Returns the live-sorted comment list plus a
// connection status useful for showing a "Live" indicator.
export function useRoomComments(roomId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  // Track seen ids so an optimistic insert + realtime echo don't duplicate.
  const seen = useRef<Set<string>>(new Set());

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
      seen.current.add(comment.id);
      setComments((prev) => appendRoomComments(prev, [comment]));
      return comment.id;
    },
    [roomId],
  );

  const confirmOptimisticComment = useCallback(
    (optimisticId: string, confirmed: Comment) => {
      seen.current.delete(optimisticId);
      seen.current.add(confirmed.id);
      setComments((prev) => replaceRoomComment(prev, optimisticId, confirmed));
    },
    [],
  );

  const rejectOptimisticComment = useCallback((optimisticId: string) => {
    seen.current.delete(optimisticId);
    setComments((prev) => removeRoomComment(prev, optimisticId));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const upsert = (incoming: Comment[]) => {
      setComments((prev) => {
        for (const c of incoming) {
          if (seen.current.has(c.id)) continue;
          seen.current.add(c.id);
        }
        return appendRoomComments(prev, incoming);
      });
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
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const c = payload.new as Comment;
          if (c.moderation_status !== "visible") return;
          upsert([c]);
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
