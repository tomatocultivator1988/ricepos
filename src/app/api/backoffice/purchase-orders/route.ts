import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const status = request.nextUrl.searchParams.get("status")

    let query = db.from("purchase_orders")
      .select("*, suppliers(name), purchase_order_items(id, qty_ordered, qty_received)")
      .eq("store_id", storeId)
    if (status && status !== "all") query = query.eq("status", status)
    query = query.order("created_at", { ascending: false })

    const { data: pos } = await query

    const formatted = (pos ?? []).map((p: any) => {
      const items = p.purchase_order_items ?? []
      const totalOrdered = items.reduce((s: number, i: any) => s + Number(i.qty_ordered), 0)
      const totalReceived = items.reduce((s: number, i: any) => s + Number(i.qty_received), 0)
      return {
        id: p.id, po_number: p.po_number, supplier_name: p.suppliers?.name ?? "—",
        supplier_id: p.supplier_id, status: p.status, order_date: p.order_date,
        expected_date: p.expected_date, total_cost: p.total_cost, note: p.note,
        line_count: items.length,
        pct_received: totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0,
      }
    })

    return NextResponse.json({ purchaseOrders: formatted })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { supplier_id, expected_date, note, lines } = body

    if (!supplier_id) return NextResponse.json({ error: "Supplier is required" }, { status: 400 })
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 })
    }
    for (const l of lines) {
      if (!l.item_id || Number(l.qty_ordered) <= 0) {
        return NextResponse.json({ error: "Each line needs a product and quantity > 0" }, { status: 400 })
      }
      if (Number(l.unit_cost) < 0) {
        return NextResponse.json({ error: "Unit cost cannot be negative" }, { status: 400 })
      }
    }

    // Verify supplier
    const { data: supplier } = await db.from("suppliers").select("id").eq("id", supplier_id).eq("store_id", storeId).single()
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 400 })

    // Generate PO number (year-based, po_sequences pattern)
    const year = new Date().getFullYear()
    const { data: seq } = await db.from("po_sequences")
      .select("last_number").eq("store_id", storeId).eq("year", year).maybeSingle()
    let num = 1
    if (seq) {
      num = seq.last_number + 1
      await db.from("po_sequences").update({ last_number: num }).eq("store_id", storeId).eq("year", year)
    } else {
      await db.from("po_sequences").insert({ store_id: storeId, year, last_number: 1 })
    }
    const poNumber = `PO-${year}-${String(num).padStart(6, "0")}`

    // Compute total
    const totalCost = lines.reduce((s: number, l: any) => s + (Number(l.qty_ordered) * Number(l.unit_cost)), 0)

    // Insert PO
    const poId = uuid()
    const { error: poErr } = await db.from("purchase_orders").insert({
      id: poId, store_id: storeId, po_number: poNumber, supplier_id,
      status: "ordered", order_date: new Date().toISOString().split("T")[0],
      expected_date: expected_date || null, total_cost: totalCost, note: note || null,
      created_by: session.employeeId,
    })
    if (poErr) return NextResponse.json({ error: poErr.message }, { status: 400 })

    // Insert lines (snapshot item name)
    for (const l of lines) {
      const { data: item } = await db.from("items").select("name").eq("id", l.item_id).single()
      await db.from("purchase_order_items").insert({
        id: uuid(), po_id: poId, item_id: l.item_id,
        item_name: item?.name ?? "Unknown",
        qty_ordered: Number(l.qty_ordered), qty_received: 0,
        unit_cost: Number(l.unit_cost),
        line_total: Number(l.qty_ordered) * Number(l.unit_cost),
      })
    }

    await db.from("journal").insert({
      id: uuid(), store_id: storeId, event_type: "po_created", employee_id: session.employeeId,
      details: { po_number: poNumber, supplier_id, total_cost: totalCost, lines: lines.length },
    })

    return NextResponse.json({ purchaseOrder: { id: poId, po_number: poNumber, total_cost: totalCost } }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
