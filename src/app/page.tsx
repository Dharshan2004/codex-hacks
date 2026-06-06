import Link from "next/link";

import { SetupClient } from "@/components/SetupClient";
import { getCatalog } from "@/lib/rooms";
import type { CatalogProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

// Setup experience (Issue 001): browse the seeded catalog, pick a lineup,
// create a stream room, and get host + buyer links.
export default async function SetupPage() {
  let catalog: CatalogProduct[] = [];
  let loadError: string | null = null;
  try {
    catalog = await getCatalog();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load catalog.";
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛍️</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Shopee Live Producer
          </h1>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Select products from your catalog to build a stream lineup, then go
          live. You&apos;ll get a host console link and a shareable buyer link.
        </p>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-semibold">Could not load the catalog.</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-3 text-amber-700">
            Make sure your Supabase credentials are set in{" "}
            <code className="rounded bg-amber-100 px-1">.env.local</code> and
            that the migrations + seed have been applied (see{" "}
            <code className="rounded bg-amber-100 px-1">README.md</code>).
          </p>
        </div>
      ) : catalog.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
          The catalog is empty. Apply the seed with{" "}
          <code className="rounded bg-neutral-100 px-1">npm run db:push</code>.
        </div>
      ) : (
        <SetupClient catalog={catalog} />
      )}

      <footer className="mt-10 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
        <Link href="/" className="hover:text-shopee">
          Setup
        </Link>{" "}
        · Sea X Codex Hackathon demo
      </footer>
    </main>
  );
}
