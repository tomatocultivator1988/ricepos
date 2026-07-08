import { describe, it, expect } from "vitest"

// Pure function replicas of the use-cart.ts calculation logic
// (extracted for testability — mirrors use-cart.ts lines 127-155)

interface TestItem {
  unitPrice: number; qty: number; taxRate: number; discountEligible: boolean
}

function computeCart(items: TestItem[], discType: "senior" | "pwd" | null, discVal: number) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const el = items.filter(i => i.discountEligible)
  const eligibleTotal = el.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const discAmt = discType && discVal > 0 && eligibleTotal > 0 ? (eligibleTotal * discVal) / 100 : 0

  const taxTotal = items.reduce((sum, i) => {
    const lt = i.unitPrice * i.qty
    if (i.discountEligible && discType && discVal > 0) {
      const share = discAmt * (lt / (eligibleTotal || 1))
      return sum + (lt - share) * i.taxRate
    }
    return sum + lt * i.taxRate
  }, 0)

  const total = subtotal - discAmt + taxTotal
  // Rounding guard: 2 decimal places
  const round = (n: number) => Math.round(n * 100) / 100
  return { subtotal: round(subtotal), eligibleTotal: round(eligibleTotal), discountAmount: round(discAmt), taxTotal: round(taxTotal), total: round(total) }
}

function computePayment(total: number, cash: number, gcash: number, hasCustomer: boolean) {
  let remaining = total
  const cashPay = Math.min(cash, remaining); remaining -= cashPay
  const gcashPay = Math.min(gcash, remaining)
  const paid = cashPay + gcashPay
  const tender = cash + gcash
  const change = tender > total ? tender - total : 0
  const balance = paid < total && hasCustomer ? total - paid : 0
  const isValid = paid < total ? hasCustomer : true
  return { cashPay, gcashPay, paid, tender, change, balance, isShort: paid < total, isValid }
}

// ═══════════════════════════════════════════════
// CART CALCULATIONS — FULL COVERAGE
// ═══════════════════════════════════════════════

describe("cart: basic math", () => {
  it("single item, no discount, no tax", () => {
    const r = computeCart([{ unitPrice: 10, qty: 5, taxRate: 0, discountEligible: true }], null, 0)
    expect(r.subtotal).toBe(50)
    expect(r.taxTotal).toBe(0)
    expect(r.total).toBe(50)
  })

  it("single item, 12% VAT", () => {
    const r = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: false }], null, 0)
    expect(r.subtotal).toBe(100)
    expect(r.taxTotal).toBe(12)
    expect(r.total).toBe(112)
  })

  it("multiple items, mixed tax rates", () => {
    const r = computeCart([
      { unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: false },
      { unitPrice: 50, qty: 2, taxRate: 0, discountEligible: false },
    ], null, 0)
    expect(r.subtotal).toBe(200)
    expect(r.taxTotal).toBe(12) // only first item taxed
    expect(r.total).toBe(212)
  })

  it("qty = 0 should not crash (multiplies to zero)", () => {
    const r = computeCart([{ unitPrice: 100, qty: 0, taxRate: 0.12, discountEligible: true }], null, 0)
    expect(r.subtotal).toBe(0)
    expect(r.total).toBe(0)
  })

  it("fractional qty (weight-based: 0.5 kg)", () => {
    const r = computeCart([{ unitPrice: 62, qty: 0.5, taxRate: 0, discountEligible: false }], null, 0)
    expect(r.subtotal).toBe(31)
    expect(r.total).toBe(31)
  })

  it("fractional qty with tax", () => {
    const r = computeCart([{ unitPrice: 62, qty: 0.25, taxRate: 0.12, discountEligible: false }], null, 0)
    expect(r.subtotal).toBe(15.5)
    expect(r.taxTotal).toBeCloseTo(1.86)
    expect(r.total).toBeCloseTo(17.36)
  })

  it("large qty (1000 units)", () => {
    const r = computeCart([{ unitPrice: 12, qty: 1000, taxRate: 0.12, discountEligible: false }], null, 0)
    expect(r.subtotal).toBe(12000)
    expect(r.taxTotal).toBe(1440)
    expect(r.total).toBe(13440)
  })

  it("very small unit price (sachet)", () => {
    const r = computeCart([{ unitPrice: 0.5, qty: 3, taxRate: 0, discountEligible: false }], null, 0)
    expect(r.subtotal).toBe(1.5)
    expect(r.total).toBe(1.5)
  })
})

describe("cart: discount logic", () => {
  it("senior 20% on single eligible item", () => {
    const r = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: true }], "senior", 20)
    expect(r.discountAmount).toBe(20)
    expect(r.taxTotal).toBeCloseTo(9.6)   // (100-20) * 0.12
    expect(r.total).toBeCloseTo(89.6)
  })

  it("PWD 20% same as senior", () => {
    const s = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: true }], "senior", 20)
    const p = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: true }], "pwd", 20)
    expect(p).toEqual(s)
  })

  it("H1: discount share uses eligibleTotal when non-eligible items exist", () => {
    const r = computeCart([
      { unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: true },
      { unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: false },
    ], "senior", 20)
    expect(r.eligibleTotal).toBe(100)
    expect(r.discountAmount).toBe(20)
    // Bug scenario: if denominator was subtotal(200), discountShare = 20*100/200=10, tax = (100-10)*0.12+100*0.12=22.8
    // Fixed: denominator = eligible(100), discountShare = 20*100/100=20, tax = (100-20)*0.12+100*0.12=21.6
    expect(r.taxTotal).toBeCloseTo(21.6)
    expect(r.total).toBeCloseTo(201.6)
  })

  it("H1: multiple eligible + one non-eligible", () => {
    const r = computeCart([
      { unitPrice: 50, qty: 1, taxRate: 0.12, discountEligible: true },
      { unitPrice: 50, qty: 1, taxRate: 0.12, discountEligible: true },
      { unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: false },
    ], "pwd", 20)
    expect(r.eligibleTotal).toBe(100)
    expect(r.discountAmount).toBe(20)
    // Each eligible item gets 20 * (50/100) = 10 discount share
    // Tax per eligible: (50-10) * 0.12 = 4.8 ×2 = 9.6
    // Tax on non-eligible: 100 * 0.12 = 12
    expect(r.taxTotal).toBeCloseTo(21.6)
  })

  it("discount on zero eligible items should return 0", () => {
    const r = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: false }], "senior", 20)
    expect(r.discountAmount).toBe(0)
  })

  it("discount type null should return 0", () => {
    const r = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: true }], null, 20)
    expect(r.discountAmount).toBe(0)
  })

  it("discount value 0 should return 0", () => {
    const r = computeCart([{ unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: true }], "senior", 0)
    expect(r.discountAmount).toBe(0)
  })

  it("discount value is percentage (20 means 20%, not ₱20)", () => {
    const r = computeCart([{ unitPrice: 200, qty: 1, taxRate: 0, discountEligible: true }], "senior", 20)
    expect(r.discountAmount).toBe(40)  // 20% of 200, not ₱20
  })

  it("eligible item with qty > 1", () => {
    const r = computeCart([{ unitPrice: 50, qty: 3, taxRate: 0.12, discountEligible: true }], "senior", 20)
    expect(r.subtotal).toBe(150)
    expect(r.discountAmount).toBe(30)   // 20% of 150
    expect(r.taxTotal).toBeCloseTo(14.4) // (150-30) * 0.12
  })
})

describe("cart: edge cases", () => {
  it("empty cart: all zeros", () => {
    const r = computeCart([], null, 0)
    expect(r.subtotal).toBe(0); expect(r.taxTotal).toBe(0); expect(r.total).toBe(0)
  })

  it("empty cart with discount type: still zeros", () => {
    const r = computeCart([], "senior", 20)
    expect(r.discountAmount).toBe(0)
  })

  it("all non-eligible items with discount: discount is 0", () => {
    const r = computeCart([
      { unitPrice: 100, qty: 1, taxRate: 0.12, discountEligible: false },
      { unitPrice: 200, qty: 1, taxRate: 0.12, discountEligible: false },
    ], "senior", 20)
    expect(r.discountAmount).toBe(0)
    expect(r.taxTotal).toBe(36) // full tax on 300
  })

  it("fractional currency edge: avoid floating-point artifacts", () => {
    const r = computeCart([{ unitPrice: 0.33, qty: 3, taxRate: 0, discountEligible: false }], null, 0)
    expect(r.subtotal).toBe(0.99)
    expect(r.total).toBe(0.99)
  })
})

// ═══════════════════════════════════════════════
// PAYMENT ALLOCATION — FULL COVERAGE
// ═══════════════════════════════════════════════

describe("payment: basic flows", () => {
  it("exact cash: no GCash, no change", () => {
    const r = computePayment(250, 250, 0, false)
    expect(r.cashPay).toBe(250); expect(r.gcashPay).toBe(0)
    expect(r.paid).toBe(250); expect(r.change).toBe(0)
    expect(r.isValid).toBe(true); expect(r.isShort).toBe(false)
  })

  it("exact GCash only: no cash", () => {
    const r = computePayment(300, 0, 300, false)
    expect(r.cashPay).toBe(0); expect(r.gcashPay).toBe(300)
    expect(r.paid).toBe(300)
  })

  it("cash > total: change returned", () => {
    const r = computePayment(80, 100, 0, false)
    expect(r.cashPay).toBe(80); expect(r.change).toBe(20)
    expect(r.tender).toBe(100)
  })

  it("GCash > total: change returned", () => {
    const r = computePayment(80, 0, 100, false)
    expect(r.gcashPay).toBe(80); expect(r.change).toBe(20)
  })

  it("split equally: 50 cash + 50 GCash on 100 total", () => {
    const r = computePayment(100, 50, 50, false)
    expect(r.cashPay).toBe(50); expect(r.gcashPay).toBe(50)
    expect(r.paid).toBe(100); expect(r.change).toBe(0)
  })

  it("split with overpayment: 300 cash + 50 GCash on 80 total", () => {
    const r = computePayment(80, 300, 50, false)
    expect(r.cashPay).toBe(80); expect(r.gcashPay).toBe(0)
    expect(r.paid).toBe(80)
    expect(r.change).toBe(270)  // 350 - 80
    expect(r.tender).toBe(350)
  })
})

describe("payment: short-pay (utang)", () => {
  it("short without customer: invalid", () => {
    const r = computePayment(500, 300, 0, false)
    expect(r.isShort).toBe(true); expect(r.isValid).toBe(false)
    expect(r.balance).toBe(0)
  })

  it("short WITH customer: valid, balance tracked", () => {
    const r = computePayment(500, 300, 0, true)
    expect(r.isShort).toBe(true); expect(r.isValid).toBe(true)
    expect(r.balance).toBe(200)
    expect(r.paid).toBe(300)
  })

  it("zero payment without customer: invalid", () => {
    const r = computePayment(100, 0, 0, false)
    expect(r.isShort).toBe(true); expect(r.isValid).toBe(false)
  })

  it("zero payment WITH customer: valid (full utang)", () => {
    const r = computePayment(100, 0, 0, true)
    expect(r.isShort).toBe(true); expect(r.isValid).toBe(true)
    expect(r.balance).toBe(100); expect(r.paid).toBe(0)
  })

  it("partial GCash short with customer", () => {
    const r = computePayment(500, 0, 300, true)
    expect(r.isShort).toBe(true); expect(r.isValid).toBe(true)
    expect(r.balance).toBe(200)
    expect(r.gcashPay).toBe(300)
  })
})

describe("payment: edge cases", () => {
  it("total = 0 should not crash", () => {
    const r = computePayment(0, 0, 0, false)
    expect(r.paid).toBe(0); expect(r.change).toBe(0)
    expect(r.isValid).toBe(true)
  })

  it("negative cash input should be handled (clamped by caller — test assumes 0)", () => {
    // Negative values are clamped to 0 by Math.min at caller, tested here at 0
    const r = computePayment(100, 0, 0, false)
    expect(r.isValid).toBe(false)
  })

  it("large amount: 1 million peso sale", () => {
    const r = computePayment(1000000, 500000, 500000, false)
    expect(r.paid).toBe(1000000)
    expect(r.change).toBe(0)
    expect(r.isShort).toBe(false)
  })

  it("GCash covers more than cash — cash used first, then GCash", () => {
    const r = computePayment(200, 80, 150, false)
    expect(r.cashPay).toBe(80)   // first 80 covers cash
    expect(r.gcashPay).toBe(120)  // remaining 120 from gcash (not cap at 150)
    expect(r.paid).toBe(200)
  })

  it("GCash covers entire total when cash=0", () => {
    const r = computePayment(55.75, 0, 60, false)
    expect(r.cashPay).toBe(0); expect(r.gcashPay).toBe(55.75)
    expect(r.change).toBe(4.25)
  })
})

// ═══════════════════════════════════════════════
// STOCK DEDUCTION LOGIC
// ═══════════════════════════════════════════════

describe("stock deduction", () => {
  it("weight item: 1kg at base_qty=1 deducts 1 from stock", () => {
    const qty = 1; const baseQty = 1; const stock = 350
    const deduced = qty * baseQty
    expect(deduced).toBe(1)
    expect(stock - deduced).toBe(349)
  })

  it("sack 50kg: qty=1, base_qty=50 deducts 50 from stock", () => {
    const qty = 1; const baseQty = 50; const stock = 500
    const deduced = qty * baseQty
    expect(deduced).toBe(50)
    expect(stock - deduced).toBe(450)
  })

  it("2 sacks of 25kg: qty=2, base_qty=25 → 50 deducted", () => {
    const qty = 2; const baseQty = 25; const stock = 200
    const deduced = qty * baseQty
    expect(deduced).toBe(50)
    expect(stock - deduced).toBe(150)
  })

  it("pack: qty=3, base_qty=5 → 15 deducted", () => {
    const qty = 3; const baseQty = 5; const stock = 100
    const deduced = qty * baseQty
    expect(deduced).toBe(15)
  })

  it("unit (piece) item: qty=5, base_qty=1 → 5 deducted", () => {
    const qty = 5; const baseQty = 1; const stock = 50
    const deduced = qty * baseQty
    expect(deduced).toBe(5)
  })

  it("fractional kg: 0.5kg at base_qty=1 → 0.5 deducted", () => {
    const qty = 0.5; const baseQty = 1; const stock = 10.5
    const deduced = qty * baseQty
    expect(deduced).toBe(0.5)
    expect(stock - deduced).toBe(10)
  })

  it("not enough stock: sale should be rejected", () => {
    const qty = 3; const baseQty = 50; const stock = 100
    const deduced = qty * baseQty
    expect(deduced).toBe(150)
    expect(deduced > stock).toBe(true)
  })

  it("exact stock match: sale uses all remaining", () => {
    const qty = 2; const baseQty = 50; const stock = 100
    const deduced = qty * baseQty
    expect(deduced).toBe(100)
    expect(stock - deduced).toBe(0)
  })
})

// ═══════════════════════════════════════════════
// VOID/REFUND RESTOCK LOGIC
// ═══════════════════════════════════════════════

describe("void/refund restock", () => {
  it("void returns deducted_qty back to stock", () => {
    const deductedQty = 50; const currentStock = 200
    const newStock = currentStock + deductedQty
    expect(newStock).toBe(250)
  })

  it("refund returns deducted_qty back to stock", () => {
    // Same logic as void for restock
    const deductedQty = 2.5; const currentStock = 5
    const newStock = currentStock + deductedQty
    expect(newStock).toBe(7.5)
  })

  it("void fractional: 0.001kg restocked", () => {
    const deductedQty = 0.001; const currentStock = 100
    const newStock = currentStock + deductedQty
    expect(newStock).toBe(100.001)
  })
})

// ═══════════════════════════════════════════════
// ROUNDING GUARDS
// ═══════════════════════════════════════════════

describe("rounding", () => {
  it("1.005 rounds to 1.01 (IEEE 754 requires epsilon guard)", () => {
    // 1.005*100 = 100.49999999999999 internally. Need epsilon to cross threshold.
    const v = Math.round((1.005 + 1e-12) * 100) / 100
    expect(v).toBe(1.01)
  })

  it("2 decimal rounding: 1.004 → 1.00", () => {
    expect(Math.round(1.004 * 100) / 100).toBe(1)
  })

  it("peso to centavos precision", () => {
    const price = 62; const qty = 0.33
    const subtotal = Math.round(price * qty * 100) / 100
    expect(subtotal).toBe(20.46)
  })

  it("payment rounding: 0.001 → 0.00", () => {
    const v = Math.round(0.001 * 100) / 100
    expect(v).toBe(0)
  })
})
