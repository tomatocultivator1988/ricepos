"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface CartItem {
  itemId: string
  itemName: string
  categoryId: string | null
  unitId: string
  unitName: string
  baseQty: number
  qty: number
  unitPrice: number
  stockQty: number
  sellBy: "weight" | "unit"
  taxRate: number
  discountEligible: boolean
}

export interface CartDiscount {
  type: "senior" | "pwd" | null
  value: number
  name: string
}

export interface CartState {
  items: CartItem[]
  discount: CartDiscount
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState<CartDiscount>({ type: null, value: 0, name: "" })
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerBalance, setCustomerBalance] = useState(0)
  const syncRef = useRef<NodeJS.Timeout | null>(null)

  // Load cart from pos_carts on mount
  useEffect(() => {
    fetch("/api/pos/cart").then(r => r.json()).then(d => {
      if (d.cart?.cart_data) {
        try {
          const data = typeof d.cart.cart_data === "string" ? JSON.parse(d.cart.cart_data) : d.cart.cart_data
          if (data.items) setItems(data.items)
          if (data.discount) setDiscount(data.discount)
          if (data.customerId) setCustomerId(data.customerId)
          if (data.customerName) setCustomerName(data.customerName)
          if (data.customerBalance !== undefined) setCustomerBalance(data.customerBalance)
        } catch { /* ignore corrupt cart */ }
      }
    }).catch(() => {})
  }, [])

  // Sync cart to DB every 500ms
  const scheduleSync = useCallback((cartData: any) => {
    if (syncRef.current) clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => {
      fetch("/api/pos/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_data: {
            items: cartData.items,
            discount: cartData.discount,
            customerId: cartData.customerId,
            customerName: cartData.customerName,
            customerBalance: cartData.customerBalance,
          }
        }),
      }).catch(() => {})
    }, 500)
  }, [])

  const sync = useCallback(() => {
    scheduleSync({ items, discount, customerId, customerName, customerBalance })
  }, [items, discount, customerId, customerName, customerBalance, scheduleSync])

  useEffect(() => { sync() }, [sync])

  // Merge key: itemId + unitId
  function mergeKey(item: Pick<CartItem, "itemId" | "unitId">) {
    return `${item.itemId}::${item.unitId}`
  }

  function addItem(item: CartItem) {
    setItems(prev => {
      const key = mergeKey(item)
      const existing = prev.findIndex(i => mergeKey(i) === key)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = {
          ...updated[existing],
          qty: updated[existing].qty + item.qty,
        }
        return updated
      }
      return [...prev, item]
    })
  }

  function updateQty(itemKey: string, qty: number) {
    setItems(prev => prev.map(i =>
      mergeKey(i) === itemKey ? { ...i, qty } : i
    ).filter(i => i.qty > 0))
  }

  function removeItem(itemKey: string) {
    setItems(prev => prev.filter(i => mergeKey(i) !== itemKey))
  }

  function clearCart() {
    setItems([])
    setDiscount({ type: null, value: 0, name: "" })
    setCustomerId(null)
    setCustomerName("")
    setCustomerBalance(0)
  }

  function setCustomer(custId: string | null, name: string, balance: number) {
    setCustomerId(custId)
    setCustomerName(name)
    setCustomerBalance(balance)
  }

  // Calculations
  const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0)

  const eligibleTotal = items.filter(i => i.discountEligible).reduce((s, i) => s + (i.unitPrice * i.qty), 0)

  const discountAmount = (() => {
    if (!discount.type || discount.value <= 0) return 0
    const eligibleItems = items.filter(i => i.discountEligible)
    if (eligibleItems.length === 0) return 0
    return eligibleTotal * (discount.value / 100)
  })()

  const afterDiscount = subtotal - discountAmount

  const taxTotal = items.reduce((sum, i) => {
    const lineTotal = i.unitPrice * i.qty
    if (i.discountEligible && discount.type && discount.value > 0) {
      const discountShare = discountAmount * (lineTotal / (eligibleTotal || 1))
      return sum + ((lineTotal - discountShare) * i.taxRate)
    }
    return sum + (lineTotal * i.taxRate)
  }, 0)

  const total = afterDiscount + taxTotal

  const totalDeductedQty = items.reduce((sum, i) => sum + (i.qty * i.baseQty), 0)

  return {
    items, discount,
    customerId, customerName, customerBalance,
    subtotal, discountAmount, taxTotal, total, totalDeductedQty,
    addItem, updateQty, removeItem, clearCart,
    setDiscount, setCustomer, mergeKey,
  }
}
