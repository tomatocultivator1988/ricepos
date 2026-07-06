import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind, forbid } from "@/lib/auth/session"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: allItems } = await db
      .from("items")
      .select("id, name, category_id, stock_qty, min_stock, track_stock, price, is_active, item_type, categories(name)")
      .eq("store_id", storeId)

    const items = allItems ?? []

    // Split by type
    const rawIngredients = items.filter(i => i.track_stock && i.item_type === 'ingredient')
    const supplies = items.filter(i => i.track_stock && i.item_type === 'supply')
    const outsourced = items.filter(i => i.track_stock && i.price > 0 && i.item_type === 'product')

    const ingMap = new Map<string, number>()
    for (const ing of rawIngredients) {
      ingMap.set(ing.name, Number(ing.stock_qty))
    }
    // Include supplies in can-make calculation (cups, lids, straws)
    for (const s of supplies) {
      ingMap.set(s.name, Number(s.stock_qty))
    }

    // Build recipes from DB for can-make
    const { data: allVariants } = await db.from("product_variants").select("id, product_id")
    const { data: allIngs } = await db.from("product_ingredients").select("product_variant_id, quantity, items!inner(id, name)")
    const recipes = new Map<string, { name: string; perUnit: number }[]>()
    for (const ing of (allIngs ?? [])) {
      const vid = ing.product_variant_id
      const pid = (allVariants ?? []).find(v => v.id === vid)?.product_id
      if (!pid) continue
      if (!recipes.has(pid)) recipes.set(pid, [])
      recipes.get(pid)!.push({ name: (ing.items as any)?.name || "Unknown", perUnit: Number(ing.quantity) })
    }

    const products = items.filter(i => i.price > 0)
    const canMake = products.map(p => {
      const recipe = recipes.get(p.id) || []
      let minBottles = Infinity
      let limitBy = ""

      for (const r of recipe) {
        const available = ingMap.get(r.name) ?? 0
        if (r.perUnit > 0) {
          const bottles = Math.floor(available / r.perUnit)
          if (bottles < minBottles) { minBottles = bottles; limitBy = r.name }
        }
      }

      return {
        id: p.id, name: p.name, price: Number(p.price),
        canMake: minBottles === Infinity ? 0 : minBottles,
        limitedBy: limitBy,
        recipe: recipe,
      }
    })

    const formatItem = (item: any) => {
      const qty = Number(item.stock_qty); const min = Number(item.min_stock)
      let status: "ok" | "low" | "out" = "ok"
      if (qty <= 0) status = "out"
      else if (qty <= min) status = "low"
      return { id: item.id, name: item.name, stockQty: qty, minStock: min, trackStock: item.track_stock, price: Number(item.price), status, itemType: item.item_type }
    }

    return NextResponse.json({
      ingredients: rawIngredients.map(formatItem),
      supplies: supplies.map(formatItem),
      outsourced: outsourced.map(formatItem),
      products: canMake,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Only admin can adjust inventory")
    const storeId = session.storeId

    const body = await request.json()
    const { itemId, qty, note, reason, cost } = body
    const adjReason = reason || "adjustment"

    if (!itemId || qty === undefined || typeof qty !== "number" || qty === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { data: item } = await db.from("items")
      .select("stock_qty, track_stock")
      .eq("id", itemId).eq("store_id", storeId).single()

    if (!item) return notfind("Item not found")

    const currentQty = Number(item.stock_qty)
    const newQty = Math.max(0, currentQty + qty)

    await db.from("items")
      .update({ stock_qty: String(newQty), updated_at: new Date().toISOString() })
      .eq("id", itemId)

    await db.from("inventory_log").insert({
      store_id: storeId, item_id: itemId,
      change_qty: String(qty), qty_after: String(newQty),
      reason: adjReason, employee_id: session.employeeId,
      note: note || null,
    })

    await db.from("audit_log").insert({
      store_id: storeId, employee_id: session.employeeId,
      action: adjReason, entity_type: "inventory", entity_id: itemId,
      old_value: { stock_qty: currentQty },
      new_value: { stock_qty: newQty, note: note || null },
    })

    if (cost !== undefined && typeof cost === "number") {
      await db.from("items")
        .update({ cost: String(cost), updated_at: new Date().toISOString() })
        .eq("id", itemId)
    }

    return NextResponse.json({ success: true, newStock: newQty })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
