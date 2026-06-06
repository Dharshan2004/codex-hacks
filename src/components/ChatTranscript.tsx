"use client";

import { useEffect, useMemo, useRef } from "react";

import type { Comment } from "@/lib/types";

const ROLE_STYLES: Record<
  string,
  { label: string; bubble: string; name: string }
> = {
  buyer: {
    label: "",
    bubble: "bg-white border border-neutral-200",
    name: "text-neutral-500",
  },
  host: {
    label: "HOST",
    bubble: "bg-shopee text-white",
    name: "text-white/80",
  },
  assistant: {
    label: "AI ASSISTANT",
    bubble: "bg-violet-50 border border-violet-200",
    name: "text-violet-600",
  },
  system: {
    label: "SYSTEM",
    bubble: "bg-neutral-100 border border-neutral-200 text-neutral-500",
    name: "text-neutral-400",
  },
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// Scrollable transcript that auto-scrolls to the newest message. Shows an
// "Agent answering…" indicator under a buyer comment the DeepAgent is still
// processing, and links each AI reply to the buyer question it answers.
export function ChatTranscript({
  comments,
  emptyHint = "No comments yet.",
}: {
  comments: Comment[];
  emptyHint?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Look up a comment by id, so an assistant reply can show the question it
  // answers.
  const byId = useMemo(
    () => new Map(comments.map((c) => [c.id, c])),
    [comments],
  );

  // Re-scroll on new messages and when any processing state changes (so the
  // spinner appearing/clearing keeps the view pinned to the bottom).
  const processingKey = comments
    .filter((c) => c.ai_status === "processing")
    .map((c) => c.id)
    .join(",");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length, processingKey]);

  if (comments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-400">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="scroll-thin flex h-full flex-col gap-2 overflow-y-auto p-3">
      {comments.map((c) => {
        const style = ROLE_STYLES[c.sender_role] ?? ROLE_STYLES.buyer;
        const displayName =
          c.sender_role === "buyer"
            ? c.buyer_display_name || "Guest"
            : style.label;

        const repliedTo =
          c.sender_role === "assistant" && c.reply_to_comment_id
            ? byId.get(c.reply_to_comment_id)
            : null;

        const isProcessing =
          c.sender_role === "buyer" && c.ai_status === "processing";

        return (
          <div key={c.id} className="flex flex-col">
            <div className="flex items-center gap-2 px-1">
              <span className={`text-xs font-semibold ${style.name}`}>
                {displayName}
              </span>
              <span className="text-[10px] text-neutral-300">
                {timeLabel(c.created_at)}
              </span>
            </div>

            {/* AI reply: show the question it answers */}
            {repliedTo && (
              <div className="mt-0.5 flex max-w-[85%] items-center gap-1 border-l-2 border-violet-300 pl-2 text-[11px] text-neutral-400">
                <span className="font-medium text-neutral-500">
                  {repliedTo.buyer_display_name || "Buyer"}:
                </span>
                <span className="truncate">{truncate(repliedTo.body)}</span>
              </div>
            )}

            <div
              className={`mt-0.5 max-w-[85%] rounded-2xl px-3 py-2 text-sm ${style.bubble}`}
            >
              {c.body}
            </div>

            {/* Buyer comment still being processed by the agent */}
            {isProcessing && <AgentAnswering />}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function AgentAnswering() {
  return (
    <div className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
      </span>
      Agent answering…
    </div>
  );
}
