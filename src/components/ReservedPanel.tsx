// Placeholder for an AI work-surface area that a later slice fills in
// (AI actions, escalations, sales coach, activity log). Issue 003 only requires
// the dashboard to *reserve visible space* for these; this makes that space
// explicit and self-documenting rather than an empty div.
export function ReservedPanel({
  title,
  icon,
  hint,
  issue,
}: {
  title: string;
  icon: string;
  hint: string;
  issue: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
          <span>{icon}</span>
          {title}
        </h3>
        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
          {issue}
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{hint}</p>
    </div>
  );
}
