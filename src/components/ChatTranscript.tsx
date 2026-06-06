"use client";

import { useEffect, useRef } from "react";

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

// Scrollable transcript that auto-scrolls to the newest message.
export function ChatTranscript({
  comments,
  emptyHint = "No comments yet.",
}: {
  comments: Comment[];
  emptyHint?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

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
            <div
              className={`mt-0.5 max-w-[85%] rounded-2xl px-3 py-2 text-sm ${style.bubble}`}
            >
              {c.body}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
