import { roundCurrency } from "./round"
import { type TaxBreakdown } from "./tax"
import { applyDiscount, type DiscountInput } from "./discount"

export interface CartItem {
  unitPrice: number
  qty: number
  taxRate: number
}

export interface TotalsInput {
  items: CartItem[]
  discount?: DiscountInput
}

export interface LineItemTotal {
  unitPrice: number
  qty: number
  taxRate: number
  lineTotal: number
  taxAmount: number
  total: number
}

export interface TotalsOutput {
  lineItems: LineItemTotal[]
  subtotal: number
  discountAmount: number
  discountedSubtotal: number
  taxBreakdown: TaxBreakdown[]
  taxTotal: number
  total: number
}

export function computeTotals(input: TotalsInput): TotalsOutput {
  const subtotal = roundCurrency(
    input.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  )

  if (subtotal === 0) {
    return { lineItems: [], subtotal: 0, discountAmount: 0, discountedSubtotal: 0, taxBreakdown: [], taxTotal: 0, total: 0 }
  }

  const { discountedSubtotal, discountAmount } = applyDiscount(subtotal, input.discount)
  const ratio = discountedSubtotal / subtotal

  const lineItems: LineItemTotal[] = input.items.map(item => {
    const lineTotal = roundCurrency(item.unitPrice * item.qty)
    const proratedLine = roundCurrency(lineTotal * ratio)
    const taxAmount = roundCurrency(proratedLine * item.taxRate / 100)
    return {
      unitPrice: item.unitPrice,
      qty: item.qty,
      taxRate: item.taxRate,
      lineTotal,
      taxAmount,
      total: roundCurrency(lineTotal + taxAmount),
    }
  })

  const rateMap = new Map<number, { taxable: number; amount: number }>()
  for (const item of input.items) {
    const lineTotal = roundCurrency(item.unitPrice * item.qty)
    const proratedLine = roundCurrency(lineTotal * ratio)
    const taxAmount = roundCurrency(proratedLine * item.taxRate / 100)
    const entry = rateMap.get(item.taxRate) ?? { taxable: 0, amount: 0 }
    entry.taxable = roundCurrency(entry.taxable + proratedLine)
    entry.amount = roundCurrency(entry.amount + taxAmount)
    rateMap.set(item.taxRate, entry)
  }

  const taxBreakdown = Array.from(rateMap.entries()).map(([rate, data]) => ({
    rate,
    taxable: data.taxable,
    amount: data.amount,
  }))

  const taxTotal = roundCurrency(taxBreakdown.reduce((sum, b) => sum + b.amount, 0))
  const total = roundCurrency(discountedSubtotal + taxTotal)

  return {
    lineItems,
    subtotal,
    discountAmount,
    discountedSubtotal,
    taxBreakdown,
    taxTotal,
    total,
  }
}
