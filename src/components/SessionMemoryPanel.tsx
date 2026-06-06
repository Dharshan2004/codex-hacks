"use client";

import { useState } from "react";

import type { SessionMemory } from "@/lib/types";

function sourceLabel(sourceEvent: string | null): string {
  switch (sourceEvent) {
    case "host_answer":
      return "From host answer";
    case "host_speech":
      return "From host speech";
    default:
      return "Learned";
  }
}

// Live session-memory panel (issue 007). Shows what the AI has learned during
// this stream — from host answers and host speech — and lets the host dismiss
// anything incorrect. Memory is stream-scoped and never edits the catalog.
export function SessionMemoryPanel({
  memories,
}: {
  memories: SessionMemory[];
}) {
  const active = memories.filter((m) => m.status === "active");

  return (
    <section className="rounded-xl border border-sky-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-sky-100 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <span>🧠</span>
          Session memory
        </h3>
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
          {active.length} active
        </span>
      </div>

      {active.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">
          Nothing learned yet. Host answers and confirmed product facts from the
          stream appear here.
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto p-3">
          {active.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </section>
  );
}

function MemoryCard({ memory }: { memory: SessionMemory }) {
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/memories/${memory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      // The realtime subscription removes it from the active list.
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">
          {sourceLabel(memory.source_event)}
        </p>
        <button
          onClick={() => void dismiss()}
          disabled={busy}
          className="shrink-0 text-[11px] font-medium text-neutral-400 hover:text-red-500 disabled:opacity-50"
          title="Mark this memory as wrong / dismiss"
        >
          ✕ Dismiss
        </button>
      </div>
      <p className="mt-1 text-sm text-neutral-800">{memory.memory_text}</p>
    </article>
  );
}
