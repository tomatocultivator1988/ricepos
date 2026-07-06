"use client"

import { useState, useEffect, useCallback } from "react"

export interface CatalogItem {
  id: string
  name: string
  price: number
  cost: number
  barcode: string | null
  sku: string | null
  stockQty: number
  minStock: number
  trackStock: boolean
  categoryId: string | null
  taxRateId: string | null
  isActive: boolean
  itemType: string | null
  imageUrl: string | null
}

export interface CategoryCache {
  id: string
  name: string
  sortOrder: number
}

export interface UseCatalogReturn {
  items: CatalogItem[]
  categories: CategoryCache[]
  variants: { id: string; productId: string; sizeLabel: string; price: number }[]
  loading: boolean
  error: string | null
  searchItems: (query: string) => CatalogItem[]
  findById: (id: string) => CatalogItem | undefined
  getTaxRate: (taxRateId: string | null) => number
  refresh: () => Promise<void>
}

export function useCatalog(): UseCatalogReturn {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<CategoryCache[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taxRateMap, setTaxRateMap] = useState<Map<string, number>>(new Map())
  const [variants, setVariants] = useState<{ id: string; productId: string; sizeLabel: string; price: number }[]>([])

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/catalog")
      if (!res.ok) throw new Error("Failed to fetch catalog")
      const data = await res.json()

      setItems((data.items ?? []).map((i: any) => ({
        id: i.id, name: i.name, price: Number(i.price),
        cost: Number(i.cost || 0), barcode: i.barcode, sku: i.sku,
        stockQty: Number(i.stock_qty || 0), minStock: Number(i.min_stock || 0),
        trackStock: i.track_stock, categoryId: i.category_id,
        taxRateId: i.tax_rate_id, isActive: i.is_active,
        itemType: i.item_type, imageUrl: i.image_url,
      })))
      setCategories((data.categories ?? []).map((c: any) => ({
        id: c.id, name: c.name, sortOrder: c.sort_order,
      })))
      setTaxRateMap(new Map((data.taxRates ?? []).map((t: any) => [t.id, Number(t.rate)])))
      setVariants(data.variants ?? [])
    } catch (err) {
      setItems([])
      setCategories([])
      setError(err instanceof Error ? err.message : "Failed to load catalog")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCatalog() }, [fetchCatalog])

  const searchItems = useCallback((query: string): CatalogItem[] => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(i => i.name.toLowerCase().includes(q))
  }, [items])

  const findById = useCallback((id: string): CatalogItem | undefined => {
    return items.find(i => i.id === id)
  }, [items])

  const refresh = useCallback(async () => { await fetchCatalog() }, [fetchCatalog])

  const getTaxRate = useCallback((taxRateId: string | null): number => {
    if (!taxRateId) return 0
    return taxRateMap.get(taxRateId) ?? 0
  }, [taxRateMap])

  return { items, categories, variants, loading, error, searchItems, findById, getTaxRate, refresh }
}
