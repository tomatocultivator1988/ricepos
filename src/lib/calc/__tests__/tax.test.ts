import { describe, it, expect } from "vitest"
import { computeTax } from "../tax"

describe("computeTax", () => {
  it("single item computes correct tax", () => {
    const result = computeTax([{ unitPrice: 10, qty: 2, taxRate: 20 }])
    expect(result.breakdown).toEqual([{ rate: 20, taxable: 20, amount: 4 }])
    expect(result.total).toBe(4)
  })

  it("groups items by tax rate", () => {
    const result = computeTax([
      { unitPrice: 100, qty: 1, taxRate: 10 },
      { unitPrice: 50, qty: 2, taxRate: 10 },
      { unitPrice: 200, qty: 1, taxRate: 20 },
    ])
    expect(result.breakdown).toHaveLength(2)
    expect(result.breakdown).toContainEqual({ rate: 10, taxable: 200, amount: 20 })
    expect(result.breakdown).toContainEqual({ rate: 20, taxable: 200, amount: 40 })
    expect(result.total).toBe(60)
  })

  it("zero tax rate returns zero amount", () => {
    const result = computeTax([{ unitPrice: 50, qty: 1, taxRate: 0 }])
    expect(result.breakdown).toEqual([{ rate: 0, taxable: 50, amount: 0 }])
    expect(result.total).toBe(0)
  })

  it("handles decimal amounts with rounding", () => {
    const result = computeTax([{ unitPrice: 5.5, qty: 3, taxRate: 8.5 }])
    expect(result.breakdown).toHaveLength(1)
    expect(result.breakdown[0].rate).toBe(8.5)
    expect(result.breakdown[0].taxable).toBeCloseTo(16.5)
    // 16.5 * 0.085 = 1.4025 → banker's rounding → 1.40
    expect(result.breakdown[0].amount).toBeCloseTo(1.4)
    expect(result.total).toBeCloseTo(1.4)
  })

  it("empty items returns empty result", () => {
    const result = computeTax([])
    expect(result.breakdown).toEqual([])
    expect(result.total).toBe(0)
  })
})
