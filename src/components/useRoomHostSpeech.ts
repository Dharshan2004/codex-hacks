"use client";

import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { HostSpeech } from "@/lib/types";

// Subscribes to a room's transcribed host-speech segments (host-microphone
// feature). Loads existing rows, applies realtime INSERT/UPDATE (classification
// is set asynchronously by the agent), and polls as a fallback.
export function useRoomHostSpeech(roomId: string) {
  const [segments, setSegments] = useState<HostSpeech[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const apply = (incoming: HostSpeech[]) => {
      setSegments((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        for (const s of incoming) byId.set(s.id, s);
        return Array.from(byId.values()).sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
      });
    };

    const refresh = async () => {
      const { data, error } = await supabase
        .from("host_speech")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (cancelled || error) return;
      apply((data ?? []) as HostSpeech[]);
    };

    void refresh();

    const channel = supabase
      .channel(`host-speech:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "host_speech",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          apply([payload.new as HostSpeech]);
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

  return { segments };
}
