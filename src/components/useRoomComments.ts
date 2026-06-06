"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Comment } from "@/lib/types";

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

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const upsert = (incoming: Comment[]) => {
      setComments((prev) => {
        const next = [...prev];
        for (const c of incoming) {
          if (seen.current.has(c.id)) continue;
          seen.current.add(c.id);
          next.push(c);
        }
        next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return next;
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

  return { comments, status };
}
