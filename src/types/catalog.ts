export interface CatalogCategory {
  id: string
  name: string
  sortOrder: number
}

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
