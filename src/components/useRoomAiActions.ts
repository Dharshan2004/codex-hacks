"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { AiAction } from "@/lib/types";

// Subscribes to a room's AI actions (auto-replies + policy warnings).
// Realtime delivers new rows instantly; a lightweight poll runs as a fallback
// so the panel still updates if the WebSocket push is dropped (e.g. networks
// that block realtime). Both feed the same id-keyed upsert.
export function useRoomAiActions(roomId: string) {
  const [actions, setActions] = useState<AiAction[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const upsert = (incoming: AiAction[]) => {
      setActions((prev) => {
        const next = [...prev];
        for (const action of incoming) {
          if (seen.current.has(action.id)) continue;
          seen.current.add(action.id);
          next.push(action);
        }
        next.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return next;
      });
    };

    const refresh = async () => {
      const { data, error } = await supabase
        .from("ai_actions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      upsert((data ?? []) as AiAction[]);
    };

    void refresh();

    const channel = supabase
      .channel(`ai-actions:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_actions",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => upsert([payload.new as AiAction]),
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

    // Fallback poll: catches rows missed if realtime never delivers.
    const poll = setInterval(() => void refresh(), 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { actions, status };
}
