"use client";

import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Room } from "@/lib/types";

// Keeps a room row in sync via Realtime, seeded from the server-rendered room.
// Used so spotlight changes (and later video_mode/status) propagate live to
// every open host/buyer tab without a refresh.
export function useRoomState(initial: Room): Room {
  const [room, setRoom] = useState<Room>(initial);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`room:${initial.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${initial.id}`,
        },
        (payload) => setRoom(payload.new as Room),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initial.id]);

  return room;
}
