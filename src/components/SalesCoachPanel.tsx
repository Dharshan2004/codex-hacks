"use client";

import type {
  LineupItem,
  SalesCoachPrompt,
  SalesCoachTriggerType,
} from "@/lib/types";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const TRIGGER_LABELS: Record<SalesCoachTriggerType, string> = {
  timer: "Rhythm cue",
  repeated: "Repeated concern",
  intent: "Purchase intent",
  spotlight: "Spotlight cue",
  chat: "Live chat cue",
};

export function SalesCoachPanel({
  prompts,
  lineup,
  status = "live",
  errorMessage = null,
}: {
  prompts: SalesCoachPrompt[];
  lineup: LineupItem[];
  status?: "connecting" | "live" | "error";
  errorMessage?: string | null;
}) {
  const productNames = new Map(
    lineup.map((item) => [item.product.id, item.product.name]),
  );
  const visiblePrompts = prompts.slice(0, 5);

  return (
    <section className="rounded-xl border border-shopee/20 bg-white">
      <div className="border-b border-shopee/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">Sales coach</h3>
          <span className="rounded-full bg-shopee-light px-2 py-0.5 text-[11px] font-semibold text-shopee-dark">
            {prompts.length} cue{prompts.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {visiblePrompts.length === 0 ? (
        <EmptyCoachState status={status} errorMessage={errorMessage} />
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto p-3 scroll-thin">
          {visiblePrompts.map((prompt) => {
            const productName = prompt.product_id
              ? productNames.get(prompt.product_id) ?? "Linked product"
              : "Room-wide cue";

            return (
              <article
                key={prompt.id}
                className="rounded-lg border border-shopee/10 bg-shopee-light/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-shopee-dark">
                      {TRIGGER_LABELS[prompt.trigger_type]}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                      {productName}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-neutral-400">
                    {timeLabel(prompt.created_at)}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {promptLines(prompt.prompt_text, prompt.trigger_type).map(
                    (line, index) => (
                      <CoachLine
                        key={`${prompt.id}-${index}`}
                        line={line}
                      />
                    ),
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyCoachState({
  status,
  errorMessage,
}: {
  status: "connecting" | "live" | "error";
  errorMessage: string | null;
}) {
  if (status === "error" || errorMessage) {
    return (
      <div className="space-y-2 p-4 text-sm">
        <p className="font-semibold text-shopee-dark">Coach is offline.</p>
        <p className="text-neutral-500">
          {errorMessage ?? "Could not load sales coach cues."}
        </p>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="space-y-2 p-4 text-sm">
        <p className="font-semibold text-neutral-700">Loading coach cues...</p>
        <p className="text-neutral-400">Checking chat, spotlight, and timer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 text-sm">
      <p className="font-semibold text-neutral-700">No coach cues yet.</p>
      <div className="grid gap-1.5 text-neutral-500">
        <p>🔁 Repeated questions will trigger a cue.</p>
        <p>🛒 Checkout or voucher intent will trigger a cue.</p>
        <p>⏱️ Timer cues appear during an active stream.</p>
        <p>📌 Spotlight changes create product talking points.</p>
      </div>
    </div>
  );
}

function CoachLine({ line }: { line: string }) {
  const parsed = line.match(/^(\S+)\s+\*\*(.+?):\*\*\s*(.+)$/);
  if (!parsed) {
    return (
      <p className="rounded-md bg-white/70 px-2.5 py-2 text-sm leading-5 text-neutral-800">
        {line}
      </p>
    );
  }

  const [, emoji, label, text] = parsed;
  return (
    <div className="grid grid-cols-[1.4rem_4.6rem_1fr] items-start gap-1 rounded-md bg-white/80 px-2.5 py-2 text-sm leading-5">
      <span aria-hidden="true" className="text-base leading-5">
        {emoji}
      </span>
      <strong className="text-xs font-bold uppercase tracking-wide text-shopee-dark">
        {label}
      </strong>
      <span className="min-w-0 text-neutral-800">{text}</span>
    </div>
  );
}

function promptLines(
  promptText: string,
  triggerType: SalesCoachTriggerType,
): string[] {
  const lines = promptText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  const legacy = compactLegacyPrompt(promptText, triggerType);
  return legacy.length > 0 ? legacy : lines;
}

function compactLegacyPrompt(
  promptText: string,
  triggerType: SalesCoachTriggerType,
): string[] {
  const lead = promptText.match(/Lead with (.*), mention (.*), then ask chat/i);
  if (triggerType === "timer" && lead) {
    return [
      "⏱️ **Reset:** Refresh this product for new viewers.",
      `✅ **Say:** ${stripQuestionLead(lead[1])}`,
      `🎟️ **Deal:** ${lead[2]}`,
      "💬 **Ask:** What should I demo next?",
    ];
  }

  const spotlight = promptText.match(/lead with (.*), mention (.*), and tell buyers/i);
  if (triggerType === "spotlight" && spotlight) {
    return [
      "📌 **Pinned:** This is the product to tap now.",
      `✅ **Say:** ${stripQuestionLead(spotlight[1])}`,
      `🎟️ **Deal:** ${spotlight[2]}`,
    ];
  }

  return [];
}

function stripQuestionLead(text: string): string {
  return text.replace(/^.*\?\s*/, "").trim();
}
