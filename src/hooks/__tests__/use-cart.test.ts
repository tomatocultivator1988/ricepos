import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCart, type CartItem } from "@/hooks/use-cart"

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

const sampleItem: CartItem = {
  itemId: "i1", itemName: "Rice", categoryId: null, unitId: "u1", unitName: "kg",
  baseQty: 1, qty: 2, unitPrice: 50, stockQty: 100, sellBy: "unit",
  taxRate: 0.12, discountEligible: true,
}

function mockCartApi(initial?: any) {
  const store: any = { cart_data: initial ?? null }
  global.fetch = vi.fn(async (url: string, opts?: any) => {
    if (String(url).includes("/api/pos/cart")) {
      if (opts && opts.method === "POST") return { json: async () => ({ success: true }) }
      return { json: async () => store.cart_data ? { cart: { cart_data: store.cart_data } } : { cart: null } }
    }
    return { json: async () => ({}) }
  }) as any
  return store
}

describe("useCart hold / resume", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("holds the active cart (count+1, active empty) and resumes it with items intact", async () => {
    mockCartApi()
    const { result } = renderHook(() => useCart())
    await flush()

    act(() => { result.current.addItem(sampleItem) })
    expect(result.current.items.length).toBe(1)

    act(() => { result.current.holdCurrentCart() })
    expect(result.current.heldCarts.length).toBe(1)
    expect(result.current.items.length).toBe(0)

    const held = result.current.heldCarts[0]
    act(() => { result.current.resumeCart(held.id) })
    expect(result.current.heldCarts.length).toBe(0)
    expect(result.current.items.length).toBe(1)
    expect(result.current.items[0].itemName).toBe("Rice")
  })

  it("does not hold an empty active cart", async () => {
    mockCartApi()
    const { result } = renderHook(() => useCart())
    await flush()
    act(() => { result.current.holdCurrentCart() })
    expect(result.current.heldCarts.length).toBe(0)
  })

  it("preserves held carts after clearing active on sale", async () => {
    mockCartApi()
    const { result } = renderHook(() => useCart())
    await flush()

    act(() => { result.current.addItem(sampleItem) })
    act(() => { result.current.holdCurrentCart() }) // hold #1, active now empty
    act(() => { result.current.addItem({ ...sampleItem, itemId: "i2", itemName: "Sugar" }) }) // active #2
    expect(result.current.heldCarts.length).toBe(1)
    expect(result.current.items.length).toBe(1)

    act(() => { result.current.clearCart() }) // sale completes for #2
    expect(result.current.items.length).toBe(0)
    expect(result.current.heldCarts.length).toBe(1) // #1 still parked

    act(() => { result.current.resumeMostRecentHeld() })
    expect(result.current.items.length).toBe(1)
    expect(result.current.items[0].itemName).toBe("Rice")
  })

  it("parses legacy single-cart cart_data into one active cart", async () => {
    const store: any = { cart_data: { items: [sampleItem], discount: { type: null, value: 0, name: "" }, customerId: null } }
    global.fetch = vi.fn(async () => ({ json: async () => ({ cart: { cart_data: store.cart_data } }) })) as any
    const { result } = renderHook(() => useCart())
    await flush()
    expect(result.current.items.length).toBe(1)
    expect(result.current.heldCarts.length).toBe(0)
  })
})

