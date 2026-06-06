"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import type { CatalogProduct, Room } from "@/lib/types";

type CreatedRoom = {
  room: Room;
  hostPath: string;
  buyerPath: string;
};

// Client-side setup flow: select catalog products into a lineup and create a room.
export function SetupClient({ catalog }: { catalog: CatalogProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("Shopee Live — Tech Drop");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRoom | null>(null);

  const selectedCount = selected.size;
  const canCreate = selectedCount > 0 && !submitting;

  const orderedSelection = useMemo(
    () => catalog.filter((p) => selected.has(p.id)),
    [catalog, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createRoom() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          productIds: orderedSelection.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create room.");
      }
      setCreated(data as CreatedRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return <RoomCreated created={created} />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Seeded catalog
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selected.has(product.id)}
              onToggle={() => toggle(product.id)}
            />
          ))}
        </div>
      </section>

      <aside className="md:sticky md:top-6 md:self-start">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Stream lineup
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {selectedCount === 0
              ? "Tap products to add them."
              : `${selectedCount} product${selectedCount > 1 ? "s" : ""} selected`}
          </p>

          <label className="mt-4 block text-xs font-medium text-neutral-600">
            Stream title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-shopee focus:outline-none focus:ring-1 focus:ring-shopee"
            />
          </label>

          {orderedSelection.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {orderedSelection.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 text-sm text-neutral-700"
                >
                  <span>{p.image_emoji ?? "📦"}</span>
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            onClick={createRoom}
            disabled={!canCreate}
            className="mt-4 w-full rounded-lg bg-shopee px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-shopee-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating room…" : "Create stream room"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function RoomCreated({ created }: { created: CreatedRoom }) {
  return (
    <div className="rounded-xl border border-green-300 bg-green-50 p-6">
      <h2 className="text-lg font-bold text-green-800">
        🎉 Room created: {created.room.title}
      </h2>
      <p className="mt-1 text-sm text-green-700">
        Open the host console to produce, and share the buyer link with a judge
        or teammate.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <LinkCard
          title="Host console"
          description="Camera, live chat, product lineup, AI work surface."
          href={created.hostPath}
          cta="Open host console"
          accent="bg-shopee hover:bg-shopee-dark"
        />
        <LinkCard
          title="Buyer view"
          description="Watch the stream and submit live comments."
          href={created.buyerPath}
          cta="Open buyer view"
          accent="bg-neutral-900 hover:bg-neutral-800"
        />
      </div>
    </div>
  );
}

function LinkCard({
  title,
  description,
  href,
  cta,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
      <div className="mt-3 flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${accent}`}
        >
          {cta}
        </a>
        <code className="truncate rounded bg-neutral-100 px-2 py-1 text-[11px] text-neutral-500">
          {href}
        </code>
      </div>
    </div>
  );
}
