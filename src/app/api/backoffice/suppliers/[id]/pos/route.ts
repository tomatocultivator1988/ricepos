import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: pos, error } = await db
      .from("purchase_orders")
      .select("id, po_number, status, order_date, expected_date, total_cost, note, created_at")
      .eq("store_id", storeId)
      .eq("supplier_id", id)
      .order("order_date", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const poIds = (pos ?? []).map(p => p.id)
    let itemsByPo: Record<string, any[]> = {}
    if (poIds.length > 0) {
      const { data: lineItems } = await db
        .from("purchase_order_items")
        .select("id, po_id, item_name, qty_ordered, qty_received, unit_cost, line_total")
        .in("po_id", poIds)
      for (const item of lineItems ?? []) {
        if (!itemsByPo[item.po_id]) itemsByPo[item.po_id] = []
        itemsByPo[item.po_id].push(item)
      }
    }

    const totalSpent = (pos ?? []).reduce((s, p) => s + Number(p.total_cost), 0)

    const rows = (pos ?? []).map(p => ({
      ...p,
      items: itemsByPo[p.id] ?? [],
    }))

    return NextResponse.json({ purchaseOrders: rows, total: totalSpent, count: rows.length })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
