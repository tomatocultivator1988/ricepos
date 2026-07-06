import { describe, it, expect } from "vitest"
import { computeTotals } from "../totals"

describe("computeTotals", () => {
  it("single item computes subtotal, tax, and total correctly", () => {
    const result = computeTotals({
      items: [{ unitPrice: 10, qty: 2, taxRate: 20 }],
    })
    expect(result.subtotal).toBe(20)
    expect(result.discountAmount).toBe(0)
    expect(result.discountedSubtotal).toBe(20)
    expect(result.taxTotal).toBe(4)
    expect(result.total).toBe(24)
    expect(result.lineItems).toHaveLength(1)
    expect(result.lineItems[0]).toMatchObject({
      unitPrice: 10,
      qty: 2,
      taxRate: 20,
      lineTotal: 20,
      taxAmount: 4,
      total: 24,
    })
  })

  it("discount is applied before tax", () => {
    const result = computeTotals({
      items: [{ unitPrice: 50, qty: 1, taxRate: 10 }],
      discount: { type: "percentage", value: 20 },
    })
    expect(result.subtotal).toBe(50)
    expect(result.discountAmount).toBe(10)
    expect(result.discountedSubtotal).toBe(40)
    // Tax on discounted subtotal: 40 * 0.10 = 4
    expect(result.taxTotal).toBe(4)
    expect(result.total).toBe(44)
  })

  it("mixed tax rates produce correct breakdown", () => {
    const result = computeTotals({
      items: [
        { unitPrice: 100, qty: 1, taxRate: 10 },
        { unitPrice: 200, qty: 1, taxRate: 20 },
      ],
    })
    expect(result.subtotal).toBe(300)
    expect(result.taxBreakdown).toHaveLength(2)
    expect(result.taxBreakdown).toContainEqual({ rate: 10, taxable: 100, amount: 10 })
    expect(result.taxBreakdown).toContainEqual({ rate: 20, taxable: 200, amount: 40 })
    expect(result.taxTotal).toBe(50)
    expect(result.total).toBe(350)
  })

  it("empty items returns all zeros", () => {
    const result = computeTotals({ items: [] })
    expect(result.subtotal).toBe(0)
    expect(result.discountAmount).toBe(0)
    expect(result.discountedSubtotal).toBe(0)
    expect(result.taxBreakdown).toEqual([])
    expect(result.taxTotal).toBe(0)
    expect(result.total).toBe(0)
    expect(result.lineItems).toEqual([])
  })
})
