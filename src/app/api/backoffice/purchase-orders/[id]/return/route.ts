import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, forbid, notfind } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

// POST — return received items to supplier (atomic via RPC, admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const storeId = session.storeId
    const { id } = await params
    const body = await request.json()
    const { reason, lines } = body // { reason, lines: [{ poi_id, qty_returned }] }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "No lines to return" }, { status: 400 })
    }

    const { data: po } = await db.from("purchase_orders")
      .select("status, po_number").eq("id", id).eq("store_id", storeId).single()
    if (!po) return notfind("Purchase order not found")

    const cleanLines = lines
      .filter((l: any) => Number(l.qty_returned) > 0)
      .map((l: any) => ({
        poi_id: l.poi_id,
        qty_returned: Number(l.qty_returned),
      }))

    if (cleanLines.length === 0) {
      return NextResponse.json({ error: "Enter a quantity to return" }, { status: 400 })
    }

    const { data, error } = await db.rpc("return_purchase_order_items", {
      _po_id: id,
      _store_id: storeId,
      _employee_id: session.employeeId,
      _reason: reason || null,
      _lines: cleanLines,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const ret: any = data

    await db.from("audit_log").insert({
      id: uuid(), store_id: storeId, employee_id: session.employeeId,
      action: "po_returned", entity_type: "purchase_order", entity_id: id,
      old_value: null,
      new_value: { return_number: ret?.return_number, total_cost: ret?.total_cost, lines: cleanLines },
      reason: reason || null,
    })

    await db.from("journal").insert({
      id: uuid(), store_id: storeId, event_type: "po_returned", employee_id: session.employeeId,
      details: { po_number: po.po_number, return_number: ret?.return_number, total_cost: ret?.total_cost, lines: cleanLines },
    })

    return NextResponse.json({ return: ret })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
