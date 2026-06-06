"use client";

import type { CatalogProduct } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

// Buyer-facing "livestream-style" video area. For MVP this is the fallback
// placeholder (Issue 003) — a styled stage standing in for buyer-visible
// WebRTC (Issue 013). It overlays the spotlight product like a real live stream.
export function LivestreamStage({
  title,
  sellerName,
  spotlight,
}: {
  title: string;
  sellerName: string;
  spotlight: CatalogProduct | null;
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Animated "on air" sheen */}
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_30%_20%,#ee4d2d,transparent_55%)]" />

      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
          {sellerName}
        </span>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-5xl">📹</span>
        <p className="mt-2 max-w-xs px-4 text-sm font-medium text-white/80">
          {title}
        </p>
        <p className="mt-1 text-xs text-white/40">
          Live video stream (placeholder)
        </p>
      </div>

      {/* Spotlight product card, bottom-left, like a Shopee Live pinned item */}
      {spotlight && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-lg bg-white/95 p-2.5 shadow-lg backdrop-blur">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100 text-2xl">
            {spotlight.image_emoji ?? "📦"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-neutral-900">
              {spotlight.name}
            </p>
            <p className="text-sm font-bold text-shopee">
              {formatPrice(spotlight.price, spotlight.currency)}
            </p>
          </div>
          <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
            FEATURED
          </span>
        </div>
      )}
    </div>
  );
}
