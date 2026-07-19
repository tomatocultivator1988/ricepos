# POS Hold / Park Cart — Design

**Date:** 2026-07-19
**Status:** Approved

## Problem

At the cashier, a customer may have many items punched into the cart but is still
shopping, while a second customer arrives. The cashier needs to "park" (hold) the
current cart — frozen, nothing lost — and start a fresh empty cart for the next
customer. After the second customer pays, the held cart is resumed.

Supports **multiple** held carts (a list), not just one, so any number of dawdling
customers can be parked independently.

## Model

A single `pos_carts` row exists per store, keyed by `store_id` (column `shift_id`
currently, kept as-is — see TO-FIX L6). The `cart_data` JSON blob changes shape from
a single cart to a **list of carts**:

```json
{
  "carts": [
    { "id": "c1", "label": "Customer #1", "active": true,  "items": [...], "discount": {...}, "customerId": null, "customerName": "", "customerBalance": 0 },
    { "id": "c2", "label": "Customer #2", "active": false, "items": [],    "discount": {...}, "customerId": null, "customerName": "", "customerBalance": 0 }
  ],
  "activeId": "c1"
}
```

Fields per cart object are exactly what is already persisted today
(`items`, `discount`, `customerId`, `customerName`, `customerBalance`). No DB
migration is required — the existing `status` and `updated_at` columns remain unused
by this feature.

## `use-cart.ts` changes

Internal state becomes `carts: CartState[]` + `activeId`.

- `addItem`, `updateQty`, `removeItem`, `clearCart`, `setDiscount`, `setCustomer`
  operate on the **active** cart only.
- New functions:
  - `holdCurrentCart()` — pushes the active cart into the list as held (sets
    `active:false`), creates a fresh empty active cart, increments the customer
    label counter. No-op (returns) if the active cart has zero items.
  - `resumeCart(id)` — sets `activeId` to the given cart.
  - `heldCarts` — getter returning carts where `active === false`.
- `clearCart` on an active cart empties only that cart; held siblings persist.
  After a successful sale, `clearCart` is called on the active cart (held carts
  remain).
- `mergeKey`, calculations (`subtotal`, `discountAmount`, `taxTotal`, `total`,
  `totalDeductedQty`) operate on the active cart, surfaced as before.

Serialization to DB packs `{ carts, activeId }`. On load, parse the new shape;
fall back to the legacy single-cart shape for backward compatibility.

## UI (`pos/page.tsx`)

- Cart footer: add a **Hold** button (disabled when active cart is empty).
- When `heldCarts.length > 0`, render a compact **"Held (n)"** bar/tabs above the
  cart item list. Tap a held chip to resume it (calls `resumeCart`).
- Labels are auto-generated ("Customer #1", "Customer #2", …) — no extra prompt
  modal, keeps it lazy.
- On payment success: clear active cart. If held carts remain, auto-resume the most
  recently held one so the cashier continues seamlessly; otherwise the cart is empty.
- Barcode scan and unit-picker add always target the active cart (unchanged).

## Edge cases

- Holding an empty active cart is blocked (button disabled / no-op).
- Full hold list is synced to DB every 500ms like today, so a mid-hold terminal
  switch / reload restores all carts.
- Resuming a held cart that was mid-discount/customer preserves its state.

## Testing

- Vitest unit test on `use-cart` pure logic (no UI):
  - hold → held count +1, active cart empty.
  - resume → items restored into active.
  - pay-clear → held carts persist, active empty.
  - load: legacy single-cart `cart_data` still parses to one active cart.

## Skipped (YAGNI)

- Single-hold cap, manually named/labeled holds, drag-reorder, cross-terminal
  transfer of a held cart, hold expiry/auto-clear. Add when explicitly requested.
