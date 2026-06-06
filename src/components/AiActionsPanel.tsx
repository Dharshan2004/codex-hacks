"use client";

import type { AiAction, Comment, LineupItem } from "@/lib/types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function riskCategoryLabel(rationaleLabel: string | null): string {
  if (!rationaleLabel?.startsWith("policy_risk:")) return "Policy risk";
  const category = rationaleLabel.slice("policy_risk:".length);
  const labels: Record<string, string> = {
    medical: "Medical claim",
    hearing_health: "Hearing-health claim",
    legal: "Legal claim",
    financial: "Financial claim",
    guaranteed_result: "Guaranteed result",
    fake_discount: "Fake discount",
    refund_warranty: "Refund / warranty",
    safety: "Safety claim",
  };
  return labels[category] ?? "Policy risk";
}

export function AiActionsPanel({
  actions,
  lineup,
  comments,
}: {
  actions: AiAction[];
  lineup: LineupItem[];
  comments: Comment[];
}) {
  const productNames = new Map(
    lineup.map((item) => [item.product.id, item.product.name]),
  );
  const commentBodies = new Map(comments.map((c) => [c.id, c.body]));
  const warnings = actions.filter((a) => a.action_type === "warn");
  const autoReplies = actions.filter((a) => a.action_type === "auto_reply");

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">AI actions</h3>
          <div className="flex items-center gap-2">
            {warnings.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                {warnings.length}{" "}
                {warnings.length === 1 ? "warning" : "warnings"}
              </span>
            )}
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600">
              {autoReplies.length} posted
            </span>
          </div>
        </div>
      </div>

      {warnings.length === 0 && autoReplies.length === 0 ? (
        <div className="p-4 text-sm text-neutral-400">No AI actions yet.</div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto p-3">
          {warnings.map((action) => (
            <article
              key={action.id}
              className="rounded-lg border border-amber-200 bg-amber-50/70 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-700">
                    {riskCategoryLabel(action.rationale_label)}
                  </p>
                  {action.product_id && (
                    <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                      {productNames.get(action.product_id) ?? "Linked product"}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-neutral-400">
                  {timeLabel(action.created_at)}
                </span>
              </div>
              {action.source_comment_id &&
                commentBodies.get(action.source_comment_id) && (
                  <p className="mt-2 truncate text-[11px] italic text-neutral-500">
                    &ldquo;{commentBodies.get(action.source_comment_id)}&rdquo;
                  </p>
                )}
              {action.host_summary && (
                <p className="mt-1.5 text-sm text-neutral-800">
                  {action.host_summary}
                </p>
              )}
            </article>
          ))}
          {autoReplies.map((action) => (
            <article
              key={action.id}
              className="rounded-lg border border-violet-100 bg-violet-50/60 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-violet-700">
                    AI answer posted
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {action.product_id
                      ? (productNames.get(action.product_id) ?? "Linked product")
                      : "Linked product"}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-neutral-400">
                  {timeLabel(action.created_at)}
                </span>
              </div>
              {action.buyer_message && (
                <p className="mt-2 text-sm text-neutral-800">
                  {action.buyer_message}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                {typeof action.confidence === "number" && (
                  <span>{Math.round(action.confidence * 100)}% confidence</span>
                )}
                {action.rationale_label && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-violet-600">
                    {action.rationale_label.replaceAll("_", " ")}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
