"use client";

import { useEffect, useRef } from "react";

import type { HostSpeech, HostSpeechClassification } from "@/lib/types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const CLASS_META: Record<
  HostSpeechClassification,
  { label: string; badge: string }
> = {
  pending: {
    label: "…",
    badge: "bg-neutral-100 text-neutral-400",
  },
  context: {
    label: "Learned",
    badge: "bg-sky-100 text-sky-700",
  },
  false_claim: {
    label: "False claim",
    badge: "bg-red-100 text-red-700",
  },
  chatter: {
    label: "Chatter",
    badge: "bg-neutral-100 text-neutral-400",
  },
};

// Live host speech transcription (host-microphone feature). Shows the running
// transcript of what the seller said, each segment tagged with how the AI
// classified it (learned context / false claim / chatter), plus the in-progress
// interim text from the mic.
export function TranscriptionPanel({
  segments,
  interim,
  listening,
}: {
  segments: HostSpeech[];
  interim: string;
  listening: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments.length, interim]);

  const isEmpty = segments.length === 0 && !interim;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <span>📝</span>
          Live transcript
          {listening && (
            <span className="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}
        </h3>
        <span className="text-[11px] text-neutral-400">
          {segments.length} segment{segments.length === 1 ? "" : "s"}
        </span>
      </div>

      {isEmpty ? (
        <div className="p-4 text-sm text-neutral-400">
          {listening
            ? "Listening… speak to see your words transcribed here."
            : "Turn on the host mic to transcribe and analyse your speech live."}
        </div>
      ) : (
        <div className="scroll-thin max-h-72 space-y-2 overflow-y-auto p-3">
          {segments.map((seg) => {
            const meta = CLASS_META[seg.classification] ?? CLASS_META.pending;
            return (
              <div key={seg.id} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-300">
                    {timeLabel(seg.created_at)}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-neutral-800">
                  {seg.transcript}
                </p>
                {seg.note && seg.classification !== "chatter" && (
                  <p className="text-[11px] text-neutral-400">{seg.note}</p>
                )}
              </div>
            );
          })}

          {interim && (
            <p className="text-sm italic text-neutral-400">{interim}…</p>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  );
}
