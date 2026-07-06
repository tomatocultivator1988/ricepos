import { describe, it, expect } from "vitest"
import { applyDiscount } from "../discount"

describe("applyDiscount", () => {
  it("20% off $50 → discount $10, subtotal $40", () => {
    const result = applyDiscount(50, { type: "percentage", value: 20 })
    expect(result.discountAmount).toBe(10)
    expect(result.discountedSubtotal).toBe(40)
  })

  it("$5 fixed off $20 → discount $5, subtotal $15", () => {
    const result = applyDiscount(20, { type: "fixed", value: 5 })
    expect(result.discountAmount).toBe(5)
    expect(result.discountedSubtotal).toBe(15)
  })

  it("$100 fixed off $20 → discount $20, subtotal $0 (not below zero)", () => {
    const result = applyDiscount(20, { type: "fixed", value: 100 })
    expect(result.discountAmount).toBe(20)
    expect(result.discountedSubtotal).toBe(0)
  })

  it("no discount → discount $0, subtotal unchanged", () => {
    const result = applyDiscount(50)
    expect(result.discountAmount).toBe(0)
    expect(result.discountedSubtotal).toBe(50)
  })

  it("undefined discount input → discount $0, subtotal unchanged", () => {
    const result = applyDiscount(50, undefined)
    expect(result.discountAmount).toBe(0)
    expect(result.discountedSubtotal).toBe(50)
  })
})
