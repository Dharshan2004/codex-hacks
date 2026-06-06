"use client";

import { useEffect, useState } from "react";

import { ChatTranscript } from "@/components/ChatTranscript";
import { CommentComposer } from "@/components/CommentComposer";
import { LineupStrip } from "@/components/LineupStrip";
import { LiveBadge } from "@/components/LiveBadge";
import { LivestreamStage } from "@/components/LivestreamStage";
import { useRoomComments } from "@/components/useRoomComments";
import { useRoomState } from "@/components/useRoomState";
import type { RoomState } from "@/lib/types";
import { generateDemoName } from "@/lib/utils";

// Buyer experience: pick a display name, then watch + chat. Chat is realtime,
// so messages from the host console (and later the AI assistant) appear live.
export function BuyerView({ state }: { state: RoomState }) {
  const { lineup } = state;
  const room = useRoomState(state.room);
  const {
    comments,
    status,
    addOptimisticComment,
    confirmOptimisticComment,
    rejectOptimisticComment,
  } = useRoomComments(room.id);
  const [name, setName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  // Suggest a generated demo name once on mount.
  useEffect(() => {
    setDraftName(generateDemoName());
  }, []);

  const spotlight =
    lineup.find((i) => i.product.id === room.spotlight_product_id)?.product ??
    null;

  if (!name) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-neutral-900">
            Join {room.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Choose a display name to join the live chat.
          </p>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Your display name"
            maxLength={40}
            className="mt-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-shopee focus:outline-none focus:ring-1 focus:ring-shopee"
            onKeyDown={(e) => {
              if (e.key === "Enter" && draftName.trim()) setName(draftName.trim());
            }}
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setDraftName(generateDemoName())}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              🎲 Random
            </button>
            <button
              onClick={() => draftName.trim() && setName(draftName.trim())}
              disabled={!draftName.trim()}
              className="flex-1 rounded-lg bg-shopee px-4 py-2 text-sm font-semibold text-white hover:bg-shopee-dark disabled:opacity-50"
            >
              Join live chat
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-neutral-50">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="truncate text-sm font-semibold text-neutral-900">
          {room.title}
        </h1>
        <LiveBadge status={status} />
      </header>

      <div className="px-4">
        <LivestreamStage
          title={room.title}
          sellerName={room.seller_name}
          spotlight={spotlight}
        />
      </div>

      <section className="px-4 py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          In this stream
        </h2>
        <LineupStrip
          lineup={lineup}
          spotlightProductId={room.spotlight_product_id}
        />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-3 pt-2 text-xs text-neutral-400">
          <span>Live chat</span>
          <span>You: {name}</span>
        </div>
        <div className="min-h-[200px] flex-1">
          <ChatTranscript
            comments={comments}
            emptyHint="Be the first to say hello 👋"
          />
        </div>
        <CommentComposer
          roomId={room.id}
          role="buyer"
          displayName={name}
          placeholder="Ask about a product…"
          onOptimisticComment={addOptimisticComment}
          onCommentConfirmed={confirmOptimisticComment}
          onCommentRejected={rejectOptimisticComment}
        />
      </section>
    </main>
  );
}
