"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { SalesCoachPrompt } from "@/lib/types";

export function useRoomSalesCoachPrompts(roomId: string) {
  const [prompts, setPrompts] = useState<SalesCoachPrompt[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;
    const supabase = getBrowserSupabase();
    let cancelled = false;

    const upsert = (incoming: SalesCoachPrompt[]) => {
      setPrompts((prev) => {
        const next = [...prev];
        for (const prompt of incoming) {
          if (seen.current.has(prompt.id)) continue;
          seen.current.add(prompt.id);
          next.push(prompt);
        }
        next.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return next;
      });
    };

    (async () => {
      const { data, error } = await supabase
        .from("sales_coach_prompts")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }
      setErrorMessage(null);
      setStatus("live");
      upsert((data ?? []) as SalesCoachPrompt[]);
    })();

    const channel = supabase
      .channel(`sales-coach:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales_coach_prompts",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => upsert([payload.new as SalesCoachPrompt]),
      )
      .subscribe((channelStatus) => {
        if (cancelled) return;
        if (channelStatus === "SUBSCRIBED") setStatus("live");
        else if (
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT"
        ) {
          setErrorMessage(`Realtime ${channelStatus.toLowerCase()}`);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { prompts, status, errorMessage };
}
