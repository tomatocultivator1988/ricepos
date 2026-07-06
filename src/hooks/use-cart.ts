"use client"

import { useState, useMemo, useCallback } from "react"
import { computeTotals } from "@/lib/calc/totals"
import type { TotalsInput } from "@/lib/calc/totals"
import type { DiscountInput } from "@/lib/calc/discount"

export interface CartModifier {
  modifierName: string
  optionName: string
  extraPrice: number
}

export interface CartItem {
  id: string
  name: string
  unitPrice: number
  qty: number
  taxRate: number
  variantId?: string
  modifiers: CartModifier[]
}

export interface UseCartReturn {
  items: CartItem[]
  customerId: string | null
  discount: DiscountInput | undefined
  addItem: (item: { id: string; name: string; unitPrice: number; taxRate: number; variantId?: string }, modifiers?: CartModifier[]) => void
  removeItem: (index: number) => void
  updateQty: (index: number, qty: number) => void
  clearCart: () => void
  setDiscount: (discount: DiscountInput | undefined) => void
  setCustomer: (customerId: string | null) => void
  totals: ReturnType<typeof computeTotals>
  itemCount: number
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([])
  const [customerId, setCustomer] = useState<string | null>(null)
  const [discount, setDiscount] = useState<DiscountInput>()

  const addItem = useCallback((item: { id: string; name: string; unitPrice: number; taxRate: number; variantId?: string }, modifiers?: CartModifier[]) => {
    const modifierExtra = (modifiers || []).reduce((sum, m) => sum + m.extraPrice, 0)
    const effectivePrice = item.unitPrice + modifierExtra

    setItems(prev => {
      const newMods = (modifiers || []).map(m => `${m.modifierName}:${m.optionName}`).sort().join(",")
      const existingIdx = prev.findIndex(i => {
        const existingMods = (i.modifiers || []).map(m => `${m.modifierName}:${m.optionName}`).sort().join(",")
        return i.id === item.id && existingMods === newMods
      })
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + 1 }
        return updated
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        unitPrice: effectivePrice,
        qty: 1,
        taxRate: item.taxRate,
        variantId: item.variantId,
        modifiers: modifiers || [],
      }]
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateQty = useCallback((index: number, qty: number) => {
    if (qty <= 0) { removeItem(index); return }
    setItems(prev => prev.map((item, i) => i === index ? { ...item, qty } : item))
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    setCustomer(null)
    setDiscount(undefined)
  }, [])

  const totalsInput: TotalsInput = useMemo(() => ({
    items: items.map(i => ({ unitPrice: i.unitPrice, qty: i.qty, taxRate: i.taxRate })),
    discount,
  }), [items, discount])

  const totals = useMemo(() => computeTotals(totalsInput), [totalsInput])
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])

  return {
    items, customerId, discount,
    addItem, removeItem, updateQty, clearCart,
    setDiscount, setCustomer,
    totals, itemCount,
  }
}
