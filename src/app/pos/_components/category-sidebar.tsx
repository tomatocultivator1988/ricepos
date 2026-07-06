"use client"

import type { CategoryCache } from "@/hooks/use-catalog"
import { Store } from "lucide-react"

interface CategorySidebarProps {
  categories: CategoryCache[]
  selected: string | null
  onSelect: (categoryId: string | null) => void
}

export function CategorySidebar({ categories, selected, onSelect }: CategorySidebarProps) {
  return (
    <nav className="overflow-y-auto border-r border-border bg-brewhas-50/30 p-3">
      <div className="space-y-1.5">
        <button
          onClick={() => onSelect(null)}
          className={`flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm font-medium transition-colors duration-200 ${
            selected === null
              ? "bg-primary/15 text-primary font-semibold"
              : "text-foreground hover:bg-secondary/50"
          }`}
        >
          <Store className="size-3.5 shrink-0" />
          All Items
        </button>
        {[...categories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full rounded-full px-4 py-2.5 text-left text-sm font-medium transition-colors duration-200 ${
                selected === cat.id
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-foreground hover:bg-secondary/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
      </div>
    </nav>
  )
}
