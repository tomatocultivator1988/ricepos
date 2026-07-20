import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

// GET — live inventory view
export async function GET() {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: items } = await db.from("items")
      .select("id, name, category_id, sell_by, stock_qty, min_stock, cost, status")
      .eq("store_id", storeId).eq("status", "active")
      .order("name", { ascending: true })

    const formatted = (items ?? []).map((i: any) => ({
      ...i,
      value: Number(i.stock_qty) * Number(i.cost),
      stock_status: Number(i.stock_qty) <= 0 ? "out"
        : Number(i.stock_qty) <= Number(i.min_stock) ? "low" : "ok",
    }))

    return NextResponse.json({ items: formatted })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — stock adjustment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { itemId, adjustmentType, quantity, reason } = body

    if (!itemId) return NextResponse.json({ error: "Item required" }, { status: 400 })
    if (quantity === undefined || Number(quantity) === 0) return NextResponse.json({ error: "Quantity required" }, { status: 400 })

    const { data: item } = await db.from("items")
      .select("stock_qty, name").eq("id", itemId).eq("store_id", storeId).single()
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    const delta = Number(quantity)
    const oldQty = Number(item.stock_qty)
    const newQty = oldQty + delta

    if (newQty < 0) {
      return NextResponse.json({ error: `Adjustment would make stock negative (current: ${oldQty})` }, { status: 400 })
    }

    const { data: result, error: rpcErr } = await db.rpc("adjust_stock", {
      p_store_id: storeId,
      p_item_id: itemId,
      p_new_qty: newQty,
      p_employee_id: session.employeeId,
      p_reason: `${adjustmentType || "adjustment"}: ${reason || ""}`,
    })

    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    const r = result as any
    if (!r.success) return NextResponse.json({ error: r.error }, { status: 400 })

    return NextResponse.json({ success: true, newQty: r.newQty })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
