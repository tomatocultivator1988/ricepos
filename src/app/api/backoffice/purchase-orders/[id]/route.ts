import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: po } = await db.from("purchase_orders")
      .select("*, suppliers(name, contact)")
      .eq("id", id).eq("store_id", storeId).single()
    if (!po) return notfind("Purchase order not found")

    const { data: items } = await db.from("purchase_order_items")
      .select("*").eq("po_id", id).order("item_name", { ascending: true })

    return NextResponse.json({
      purchaseOrder: {
        ...po,
        supplier_name: (po as any).suppliers?.name ?? "—",
        supplier_contact: (po as any).suppliers?.contact ?? null,
        items: (items ?? []).map((i: any) => ({
          ...i,
          remaining: Number(i.qty_ordered) - Number(i.qty_received),
        })),
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH — cancel PO
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params
    const body = await request.json()

    const { data: po } = await db.from("purchase_orders")
      .select("status, po_number").eq("id", id).eq("store_id", storeId).single()
    if (!po) return notfind("Purchase order not found")

    if (body.action === "cancel") {
      if (po.status === "received" || po.status === "cancelled") {
        return NextResponse.json({ error: `Cannot cancel a ${po.status} PO` }, { status: 400 })
      }
      await db.from("purchase_orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id)
      await db.from("journal").insert({
        id: uuid(), store_id: storeId, event_type: "po_cancelled", employee_id: session.employeeId,
        details: { po_number: po.po_number },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
