"use client";

import type { LineupItem } from "@/lib/types";
import { formatPrice, totalStock } from "@/lib/utils";

// Horizontal product lineup shown to buyers (and reused on the host console).
// Highlights the active spotlight product.
export function LineupStrip({
  lineup,
  spotlightProductId,
}: {
  lineup: LineupItem[];
  spotlightProductId: string | null;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto scroll-thin pb-1">
      {lineup.map((item) => {
        const p = item.product;
        const spotlighted = p.id === spotlightProductId;
        const stock = totalStock(p.stock);
        return (
          <div
            key={item.id}
            className={[
              "flex w-44 shrink-0 flex-col rounded-lg border bg-white p-3",
              spotlighted ? "border-amber-400 ring-2 ring-amber-300" : "border-neutral-200",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{p.image_emoji ?? "📦"}</span>
              {spotlighted && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  FEATURED
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-medium text-neutral-800">
              {p.name}
            </p>
            <p className="mt-1 text-sm font-bold text-shopee">
              {formatPrice(p.price, p.currency)}
            </p>
            <p className="text-[11px] text-neutral-400">
              {stock > 0 ? `${stock} left` : "Out of stock"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
