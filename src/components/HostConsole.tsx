"use client";

import { useState } from "react";

import { AiActionsPanel } from "@/components/AiActionsPanel";
import { CameraPreview } from "@/components/CameraPreview";
import { ChatTranscript } from "@/components/ChatTranscript";
import { CommentComposer } from "@/components/CommentComposer";
import { LiveBadge } from "@/components/LiveBadge";
import { ReservedPanel } from "@/components/ReservedPanel";
import { useRoomAiActions } from "@/components/useRoomAiActions";
import { useRoomComments } from "@/components/useRoomComments";
import { useRoomState } from "@/components/useRoomState";
import type { LineupItem, RoomState } from "@/lib/types";
import { formatPrice, totalStock } from "@/lib/utils";

// Host producer console. Three columns on desktop:
//  - left: camera preview + AI work surface (reserved for later slices)
//  - center: live chat (realtime) + host composer
//  - right: product lineup with spotlight control
export function HostConsole({ state }: { state: RoomState }) {
  const { lineup } = state;
  const room = useRoomState(state.room);
  const { comments, status } = useRoomComments(room.id);
  const { actions } = useRoomAiActions(room.id);

  const buyerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/buyer/${room.buyer_token}`
      : `/buyer/${room.buyer_token}`;

  return (
    <main className="min-h-screen bg-neutral-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎛️</span>
          <div>
            <h1 className="text-base font-bold text-neutral-900">
              {room.title}
            </h1>
            <p className="text-xs text-neutral-400">
              Host console · {room.seller_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge status={status} />
          <CopyBuyerLink url={buyerUrl} />
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr_0.9fr]">
        {/* Left: camera + AI work surface */}
        <section className="flex flex-col gap-4">
          <CameraPreview />

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              AI work surface
            </h2>
            <AiActionsPanel actions={actions} lineup={lineup} />
            <ReservedPanel
              icon="⚠️"
              title="Escalations & policy warnings"
              issue="006 · 008"
              hint="Questions needing your confirmation and risky-claim warnings."
            />
            <ReservedPanel
              icon="💡"
              title="Sales coach"
              issue="009"
              hint="Timely talking points, voucher nudges, and objection handling."
            />
            <ReservedPanel
              icon="📋"
              title="Activity log"
              issue="010"
              hint="Compact, timestamped record of auto-post / escalate / ignore / warn."
            />
            <ReservedPanel
              icon="🧠"
              title="Session memory"
              issue="007"
              hint="Facts learned from your answers during this stream."
            />
          </div>
        </section>

        {/* Center: live chat */}
        <section className="flex min-h-[60vh] flex-col rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-neutral-900">Live chat</h2>
            <p className="text-xs text-neutral-400">
              {comments.length} message{comments.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <ChatTranscript
              comments={comments}
              emptyHint="No buyer comments yet. Share the buyer link to start."
            />
          </div>
          <CommentComposer
            roomId={room.id}
            role="host"
            placeholder="Reply as host…"
          />
        </section>

        {/* Right: product lineup + spotlight control */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Product lineup
          </h2>
          <p className="text-xs text-neutral-400">
            Spotlight a product to feature it for buyers.
          </p>
          <div className="mt-3 space-y-3">
            {lineup.map((item) => (
              <LineupRow
                key={item.id}
                item={item}
                roomId={room.id}
                spotlighted={item.product.id === room.spotlight_product_id}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function LineupRow({
  item,
  roomId,
  spotlighted,
}: {
  item: LineupItem;
  roomId: string;
  spotlighted: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const p = item.product;
  const stock = totalStock(p.stock);

  async function toggleSpotlight() {
    setBusy(true);
    try {
      await fetch(`/api/rooms/${roomId}/spotlight`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: spotlighted ? null : p.id }),
      });
      // The realtime room subscription updates the UI; no local state needed.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={[
        "rounded-lg border p-3",
        spotlighted ? "border-amber-400 bg-amber-50" : "border-neutral-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl">{p.image_emoji ?? "📦"}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-800">
            {p.name}
          </p>
          <p className="text-sm font-bold text-shopee">
            {formatPrice(p.price, p.currency)}
          </p>
          <p className="text-[11px] text-neutral-400">
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
          </p>
        </div>
      </div>
      <button
        onClick={() => void toggleSpotlight()}
        disabled={busy}
        className={[
          "mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
          spotlighted
            ? "bg-amber-400 text-amber-900 hover:bg-amber-300"
            : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50",
        ].join(" ")}
      >
        {spotlighted ? "★ Spotlighted" : "Spotlight"}
      </button>
    </div>
  );
}

function CopyBuyerLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore.
    }
  }
  return (
    <button
      onClick={() => void copy()}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
      title={url}
    >
      {copied ? "✓ Copied buyer link" : "🔗 Copy buyer link"}
    </button>
  );
}
