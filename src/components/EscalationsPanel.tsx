"use client";

import { useMemo, useState } from "react";

import type { Comment, Escalation, LineupItem } from "@/lib/types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Host-facing escalation queue (issue 006). Shows missing-detail product
// questions the AI declined to answer, with the source comment, matched
// product, and a compact reason. The host can answer/resolve each one.
export function EscalationsPanel({
  escalations,
  lineup,
  comments,
}: {
  escalations: Escalation[];
  lineup: LineupItem[];
  comments: Comment[];
}) {
  const productNames = useMemo(
    () => new Map(lineup.map((item) => [item.product.id, item.product.name])),
    [lineup],
  );
  const commentBodies = useMemo(
    () => new Map(comments.map((c) => [c.id, c])),
    [comments],
  );

  const open = escalations.filter((e) => e.status === "open");

  return (
    <section className="rounded-xl border border-amber-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-amber-100 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <span>⚠️</span>
          Escalations
        </h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {open.length} open
        </span>
      </div>

      {escalations.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">
          No escalations. Questions the AI can&apos;t answer from linked facts
          will appear here.
        </div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto p-3">
          {escalations.map((escalation) => (
            <EscalationCard
              key={escalation.id}
              escalation={escalation}
              productName={
                escalation.product_id
                  ? productNames.get(escalation.product_id) ?? null
                  : null
              }
              sourceComment={
                escalation.source_comment_id
                  ? commentBodies.get(escalation.source_comment_id) ?? null
                  : null
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EscalationCard({
  escalation,
  productName,
  sourceComment,
}: {
  escalation: Escalation;
  productName: string | null;
  sourceComment: Comment | null;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolved = escalation.status === "answered";

  async function resolve() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/escalations/${escalation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "answered",
          hostAnswer: answer.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to resolve.");
      }
      // The realtime escalation subscription updates the card to "answered".
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={[
        "rounded-lg border p-3",
        resolved
          ? "border-neutral-200 bg-neutral-50"
          : "border-amber-200 bg-amber-50/60",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            {resolved ? "Resolved" : "Needs your answer"}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            {productName ?? "No matched product"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] text-neutral-400">
          {timeLabel(escalation.created_at)}
        </span>
      </div>

      {sourceComment && (
        <div className="mt-2 rounded-md bg-white px-2.5 py-1.5 text-sm text-neutral-800">
          <span className="text-[11px] font-medium text-neutral-400">
            {sourceComment.buyer_display_name || "Buyer"}:{" "}
          </span>
          {sourceComment.body}
        </div>
      )}

      {escalation.reason && (
        <p className="mt-2 text-xs text-neutral-500">{escalation.reason}</p>
      )}

      {resolved ? (
        escalation.host_answer && (
          <p className="mt-2 rounded-md bg-white px-2.5 py-1.5 text-sm text-neutral-700">
            <span className="text-[11px] font-medium text-green-600">
              Host answer:{" "}
            </span>
            {escalation.host_answer}
          </p>
        )
      ) : (
        <div className="mt-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer (optional), then resolve…"
            rows={2}
            className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-shopee focus:outline-none focus:ring-1 focus:ring-shopee"
          />
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
          <button
            onClick={() => void resolve()}
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "Resolving…" : "Mark answered"}
          </button>
        </div>
      )}
    </article>
  );
}
