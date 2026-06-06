// Small status pill: green pulsing dot when live, amber while connecting,
// red on error. Used by host + buyer to show realtime connection health.
export function LiveBadge({
  status,
}: {
  status: "connecting" | "live" | "error";
}) {
  const map = {
    connecting: { dot: "bg-amber-400", text: "Connecting", pulse: true },
    live: { dot: "bg-green-500", text: "Live", pulse: true },
    error: { dot: "bg-red-500", text: "Offline", pulse: false },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/5 px-2.5 py-1 text-xs font-medium text-neutral-700">
      <span className="relative flex h-2 w-2">
        {s.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.text}
    </span>
  );
}
