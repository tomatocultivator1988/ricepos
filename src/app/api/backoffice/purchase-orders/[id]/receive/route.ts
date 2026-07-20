import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

// POST — receive against a PO (atomic via RPC)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params
    const body = await request.json()
    const { lines } = body // [{ line_id, receive_qty, update_cost }]

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "No lines to receive" }, { status: 400 })
    }

    const cleanLines = lines
      .filter((l: any) => Number(l.receive_qty) > 0)
      .map((l: any) => ({
        line_id: l.line_id,
        receive_qty: Number(l.receive_qty),
        update_cost: !!l.update_cost,
        is_consignment: !!l.is_consignment,
        consignment_agreed_price: l.consignment_agreed_price || null,
      }))

    if (cleanLines.length === 0) {
      return NextResponse.json({ error: "Enter a quantity to receive" }, { status: 400 })
    }

    const { data, error } = await db.rpc("receive_purchase_order", {
      p_po_id: id,
      p_store_id: storeId,
      p_employee_id: session.employeeId,
      p_lines: cleanLines,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ purchaseOrder: data })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
