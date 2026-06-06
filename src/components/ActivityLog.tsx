"use client";

import { useState } from "react";

import type { AiAction, AiActionType, Comment } from "@/lib/types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Compact, human-readable label per action type. Never exposes model reasoning —
// only the action and its short rationale label (issue 010, criterion 7).
const ACTION_META: Record<
  AiActionType,
  { icon: string; label: string; tone: string; lowPriority?: boolean }
> = {
  auto_reply: { icon: "💬", label: "Auto-answered", tone: "text-violet-600" },
  escalate: { icon: "⚠️", label: "Escalated", tone: "text-amber-600" },
  warn: { icon: "🛡️", label: "Policy warning", tone: "text-red-600" },
  ignore: {
    icon: "🔇",
    label: "No action",
    tone: "text-neutral-400",
    lowPriority: true,
  },
  coach: { icon: "💡", label: "Sales coach", tone: "text-emerald-600" },
  memory: { icon: "🧠", label: "Learned memory", tone: "text-sky-600" },
};

// Turn a snake_case rationale label into a readable phrase.
function prettyRationale(label: string | null): string | null {
  if (!label) return null;
  return label.replaceAll(/[:_]/g, " ").trim();
}

// Secondary host activity log (issue 010): a timestamped feed of every AI
// decision — auto-answer, escalate, warn, no-action — with a compact rationale
// and the source comment, but no verbose reasoning. No-action entries are
// de-emphasised and can be hidden so they don't clutter the feed.
export function ActivityLog({
  actions,
  comments,
}: {
  actions: AiAction[];
  comments: Comment[];
}) {
  const [showIgnored, setShowIgnored] = useState(true);
  const commentBodies = new Map(comments.map((c) => [c.id, c.body]));

  // Newest first.
  const sorted = [...actions].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const ignoredCount = sorted.filter((a) => a.action_type === "ignore").length;
  const visible = showIgnored
    ? sorted
    : sorted.filter((a) => a.action_type !== "ignore");

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <span>📋</span>
          Activity log
        </h3>
        {ignoredCount > 0 && (
          <button
            onClick={() => setShowIgnored((s) => !s)}
            className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600"
          >
            {showIgnored ? `Hide no-action (${ignoredCount})` : "Show all"}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">No activity yet.</div>
      ) : (
        <div className="max-h-72 divide-y divide-neutral-100 overflow-y-auto">
          {visible.map((action) => {
            const meta = ACTION_META[action.action_type] ?? ACTION_META.ignore;
            const sourceBody = action.source_comment_id
              ? commentBodies.get(action.source_comment_id)
              : null;
            const rationale = prettyRationale(action.rationale_label);
            return (
              <div
                key={action.id}
                className={`flex items-start gap-2 px-3 py-2 ${
                  meta.lowPriority ? "opacity-60" : ""
                }`}
              >
                <span className="mt-0.5 text-sm">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${meta.tone}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-neutral-300">
                      {timeLabel(action.created_at)}
                    </span>
                  </div>
                  {sourceBody && (
                    <p className="truncate text-[11px] italic text-neutral-500">
                      &ldquo;{sourceBody}&rdquo;
                    </p>
                  )}
                  {rationale && (
                    <p className="truncate text-[11px] text-neutral-400">
                      {rationale}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
