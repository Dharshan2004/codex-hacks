import { formatPrice, totalStock } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/types";

// Compact product card used in the catalog grid and lineup lists.
export function ProductCard({
  product,
  selected,
  spotlighted,
  onToggle,
  footer,
}: {
  product: CatalogProduct;
  selected?: boolean;
  spotlighted?: boolean;
  onToggle?: () => void;
  footer?: React.ReactNode;
}) {
  const stock = totalStock(product.stock);
  const interactive = typeof onToggle === "function";

  return (
    <div
      onClick={onToggle}
      className={[
        "rounded-xl border bg-white p-4 transition",
        interactive ? "cursor-pointer hover:border-shopee hover:shadow-sm" : "",
        selected ? "border-shopee ring-2 ring-shopee/30" : "border-neutral-200",
        spotlighted ? "ring-2 ring-amber-400 border-amber-400" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-3xl">
          {product.image_emoji ?? "📦"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {product.brand && (
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                {product.brand}
              </span>
            )}
            {spotlighted && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                SPOTLIGHT
              </span>
            )}
          </div>
          <h3 className="truncate text-sm font-semibold text-neutral-900">
            {product.name}
          </h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-bold text-shopee">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.original_price && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.original_price, product.currency)}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {stock > 0 ? `${stock} in stock` : "Out of stock"}
            {product.category ? ` · ${product.category}` : ""}
          </div>
        </div>
        {interactive && (
          <div
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
              selected
                ? "border-shopee bg-shopee text-white"
                : "border-neutral-300 text-transparent",
            ].join(" ")}
            aria-hidden
          >
            ✓
          </div>
        )}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
