"use client";

import { useState } from "react";

import type { Comment, SenderRole } from "@/lib/types";

// Posts a comment to a room via the API. Used by the buyer view (role=buyer)
// and the host console (role=host). The realtime subscription handles showing
// the message, so this just clears the input on success.
export function CommentComposer({
  roomId,
  role,
  displayName,
  placeholder,
  accent = "bg-shopee hover:bg-shopee-dark",
  onOptimisticComment,
  onCommentConfirmed,
  onCommentRejected,
}: {
  roomId: string;
  role: SenderRole;
  displayName?: string;
  placeholder?: string;
  accent?: string;
  onOptimisticComment?: (draft: {
    role: SenderRole;
    displayName?: string;
    body: string;
  }) => string;
  onCommentConfirmed?: (optimisticId: string, comment: Comment) => void;
  onCommentRejected?: (optimisticId: string) => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const optimisticId = onOptimisticComment?.({
      role,
      displayName,
      body: text,
    });
    setBody("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, body: text, role, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send.");
      if (optimisticId && data.comment) {
        onCommentConfirmed?.(optimisticId, data.comment as Comment);
      }
    } catch (err) {
      if (optimisticId) onCommentRejected?.(optimisticId);
      setBody(text);
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="border-t border-neutral-200 p-3">
      {error && (
        <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Type a comment…"}
          maxLength={500}
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:border-shopee focus:outline-none focus:ring-1 focus:ring-shopee"
        />
        <button
          onClick={() => void send()}
          disabled={sending || body.trim().length === 0}
          className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${accent}`}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
