"use client"

import { createContext, useContext } from "react"
import type { UseCartReturn } from "@/hooks/use-cart"

const CartContext = createContext<UseCartReturn | null>(null)

export function useCartContext() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCartContext must be used within CartProvider")
  return ctx
}

export { CartContext }
