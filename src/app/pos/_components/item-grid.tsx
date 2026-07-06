"use client"

import { useCallback } from "react"
import { useCatalog, type CatalogItem } from "@/hooks/use-catalog"
import { ItemCard } from "./item-card"
import { Leaf } from "lucide-react"

interface ItemGridProps {
  selectedCategoryId: string | null
  onAddItem: (item: { id: string; name: string; unitPrice: number; taxRate: number }) => void
}

export function ItemGrid({ selectedCategoryId, onAddItem }: ItemGridProps) {
  const { items, loading, getTaxRate } = useCatalog()

  const filteredItems =
    selectedCategoryId === null
      ? items
      : items.filter((i) => i.categoryId === selectedCategoryId)

  const handleClick = useCallback(
    (item: CatalogItem) => {
      if (item.trackStock && item.stockQty <= 0) return
      onAddItem({
        id: item.id,
        name: item.name,
        unitPrice: item.price,
        taxRate: getTaxRate(item.taxRateId),
      })
    },
    [onAddItem, getTaxRate]
  )

  if (loading) {
    return (
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 md:grid-cols-3 content-start">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-border bg-card"
          >
            <div className="h-16 rounded-t-2xl bg-secondary/50" />
            <div className="space-y-2.5 p-3">
              <div className="h-3.5 w-3/4 rounded-full bg-secondary/60" />
              <div className="h-4 w-1/2 rounded-full bg-primary/10" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Leaf className="size-10 stroke-[1.5] opacity-40" />
        <p className="text-sm">No items in this category</p>
      </div>
    )
  }

  return (
    <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 md:grid-cols-3 content-start">
      {filteredItems.map((item) => (
        <ItemCard key={item.id} item={item} onClick={handleClick} />
      ))}
    </div>
  )
}
