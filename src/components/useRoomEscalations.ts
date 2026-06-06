"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Escalation } from "@/lib/types";

// Subscribes to a room's escalations (issue 006): loads existing rows, then
// applies realtime INSERTs (new escalations) and UPDATEs (resolved by host).
export function useRoomEscalations(roomId: string) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    // Upsert by id so an UPDATE replaces the existing row rather than appending.
    const apply = (incoming: Escalation[]) => {
      setEscalations((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]));
        for (const e of incoming) {
          byId.set(e.id, e);
          seen.current.add(e.id);
        }
        return Array.from(byId.values()).sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );
      });
    };

    (async () => {
      const { data, error } = await supabase
        .from("escalations")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        return;
      }
      apply((data ?? []) as Escalation[]);
    })();

    const channel = supabase
      .channel(`escalations:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escalations",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          apply([payload.new as Escalation]);
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

  return { escalations, status };
}
