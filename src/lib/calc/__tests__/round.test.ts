import { describe, it, expect } from "vitest"
import { roundCurrency } from "../round"

describe("roundCurrency", () => {
  it("bankers rounding 10.005 → 10.00 (round half to even)", () => {
    expect(roundCurrency(10.005, "bankers")).toBe(10.0)
  })

  it("bankers rounding 10.015 → 10.02 (round half to even)", () => {
    expect(roundCurrency(10.015, "bankers")).toBe(10.02)
  })

  it("half_up 10.005 → 10.01", () => {
    expect(roundCurrency(10.005, "half_up")).toBe(10.01)
  })

  it("floor 10.009 → 10.00", () => {
    expect(roundCurrency(10.009, "floor")).toBe(10.0)
  })

  it("ceil 10.001 → 10.01", () => {
    expect(roundCurrency(10.001, "ceil")).toBe(10.01)
  })

  it("defaults to bankers rounding", () => {
    expect(roundCurrency(10.005)).toBe(10.0)
  })
})
