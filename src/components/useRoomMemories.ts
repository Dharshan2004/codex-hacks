"use client";

import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { SessionMemory } from "@/lib/types";

// Subscribes to a room's session memories (issue 007). Loads existing rows,
// applies realtime INSERT/UPDATE (e.g. dismiss), and polls as a fallback so the
// panel stays current even if a realtime push is dropped.
export function useRoomMemories(roomId: string) {
  const [memories, setMemories] = useState<SessionMemory[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const apply = (incoming: SessionMemory[]) => {
      setMemories((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of incoming) byId.set(m.id, m);
        return Array.from(byId.values()).sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );
      });
    };

    const refresh = async () => {
      const { data, error } = await supabase
        .from("session_memories")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (cancelled || error) return;
      apply((data ?? []) as SessionMemory[]);
    };

    void refresh();

    const channel = supabase
      .channel(`memories:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_memories",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          apply([payload.new as SessionMemory]);
        },
      )
      .subscribe();

    const poll = setInterval(() => void refresh(), 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { memories };
}
