import { roundCurrency } from "./round"

export interface DiscountInput {
  type?: "percentage" | "fixed"
  value?: number
}

export function applyDiscount(subtotal: number, discount?: DiscountInput): {
  discountedSubtotal: number
  discountAmount: number
} {
  if (!discount || !discount.type || discount.value == null || discount.value === 0) {
    return { discountedSubtotal: subtotal, discountAmount: 0 }
  }

  let discountAmount: number

  if (discount.type === "percentage") {
    discountAmount = roundCurrency(subtotal * (discount.value / 100))
  } else {
    discountAmount = roundCurrency(Math.min(discount.value, subtotal))
  }

  return {
    discountedSubtotal: roundCurrency(subtotal - discountAmount),
    discountAmount,
  }
}
