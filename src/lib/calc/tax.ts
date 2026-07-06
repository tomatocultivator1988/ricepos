import { roundCurrency } from "./round"

export interface TaxInput {
  unitPrice: number
  qty: number
  taxRate: number
}

export interface TaxBreakdown {
  rate: number
  taxable: number
  amount: number
}

export interface TaxResult {
  breakdown: TaxBreakdown[]
  total: number
}

export function computeTax(items: TaxInput[]): TaxResult {
  const groups = new Map<number, number>()

  for (const item of items) {
    const lineTotal = item.unitPrice * item.qty
    groups.set(item.taxRate, (groups.get(item.taxRate) ?? 0) + lineTotal)
  }

  const breakdown: TaxBreakdown[] = []
  let total = 0

  for (const [rate, taxable] of groups) {
    const amount = roundCurrency(taxable * (rate / 100))
    breakdown.push({ rate, taxable, amount })
    total += amount
  }

  return { breakdown, total }
}
