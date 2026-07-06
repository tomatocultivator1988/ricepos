"use client"

import type { CatalogItem } from "@/hooks/use-catalog"
import { Badge } from "@/components/ui/badge"

interface ItemCardProps {
  item: CatalogItem
  onClick: (item: CatalogItem) => void
}

const COLORS: [string, string][] = [
  ["#0D9488", "#14B8A6"],
  ["#0891B2", "#06B6D4"],
  ["#D97706", "#F59E0B"],
  ["#DC2626", "#EF4444"],
  ["#7C3AED", "#8B5CF6"],
  ["#DB2777", "#EC4899"],
  ["#059669", "#10B981"],
  ["#2563EB", "#3B82F6"],
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n)
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const outOfStock = item.trackStock && item.stockQty <= 0
  const lowStock = item.trackStock && item.stockQty > 0 && item.stockQty <= item.minStock
  const colorIdx = item.name.length % COLORS.length
  const [from, to] = COLORS[colorIdx]

  return (
    <button
      onClick={() => {
        if (!outOfStock) onClick(item)
      }}
      disabled={outOfStock}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        outOfStock
          ? "opacity-50 cursor-not-allowed"
          : "hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      }`}
    >
      <div
        className="flex h-16 items-center justify-center"
        style={{
          background: outOfStock
            ? "var(--muted)"
            : `linear-gradient(135deg, ${from}22, ${to}33)`,
        }}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span
            className="font-display text-xl font-bold"
            style={{ color: outOfStock ? "var(--muted-foreground)" : from }}
          >
            {item.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-2.5 pt-2 text-left">
        <p className="line-clamp-2 font-display text-sm font-medium text-foreground leading-snug">
          {item.name}
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-primary">
          {formatCurrency(item.price)}
        </p>
      </div>
      {outOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <Badge variant="destructive" className="text-xs shadow-sm">
            Out of stock
          </Badge>
        </div>
      )}
      {!outOfStock && lowStock && (
        <Badge
          variant="outline"
          className="absolute right-2 top-2 border-amber-300 bg-amber-50 text-[10px] text-amber-700 shadow-sm"
        >
          Low stock
        </Badge>
      )}
    </button>
  )
}
