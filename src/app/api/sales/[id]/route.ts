import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, forbid } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const { id: saleId } = await params
    const body = await request.json()
    const { action, reason } = body

    if (!action || !["void", "refund"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'void' or 'refund'" }, { status: 400 })
    }
    if (action !== "reprint" && !reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 })
    }

    // Only admin can void/refund
    if (session.role !== "admin") return forbid("Only admin can perform this action")

    // Fetch the sale
    const { data: sale, error: saleErr } = await db
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .eq("store_id", session.storeId)
      .single()

    if (saleErr || !sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    if (sale.status !== "completed") {
      return NextResponse.json({ error: `Cannot ${action} a sale with status '${sale.status}'` }, { status: 400 })
    }

    // Fetch sale items
    const { data: saleItems, error: itemsErr } = await db
      .from("sale_items")
      .select("*")
      .eq("sale_id", saleId)
      .eq("status", "completed")

    if (itemsErr) {
      return NextResponse.json({ error: "Failed to fetch sale items" }, { status: 500 })
    }

    // Restock items and update sale_items
    for (const item of saleItems ?? []) {
      const restockQty = Number(item.deducted_qty)

      // Read current stock
      const { data: currentItem } = await db
        .from("items")
        .select("stock_qty")
        .eq("id", item.item_id)
        .single()

      const oldQty = Number(currentItem?.stock_qty ?? 0)
      const newQty = oldQty + restockQty

      // Restock
      await db.from("items").update({ stock_qty: newQty }).eq("id", item.item_id)

      // Log inventory
      await db.from("inventory_log").insert({
        id: uuid(),
        store_id: session.storeId,
        item_id: item.item_id,
        change_qty: restockQty,
        qty_before: oldQty,
        qty_after: newQty,
        reason: action as "void" | "refund",
        sale_id: saleId,
        employee_id: session.employeeId,
      })

      // Update sale_item status
      await db.from("sale_items")
        .update({
          status: action === "void" ? "voided" : "refunded",
          void_reason: reason,
        })
        .eq("id", item.id)
    }

    // Update sale status
    await db.from("sales")
      .update({
        status: action as "voided" | "refunded",
        void_reason: reason,
        voided_at: new Date().toISOString(),
        voided_by: session.employeeId,
      })
      .eq("id", saleId)

    // Audit log
    await db.from("audit_log").insert({
      id: uuid(),
      store_id: session.storeId,
      employee_id: session.employeeId,
      action: `sale_${action}ed`,
      entity_type: "sale",
      entity_id: saleId,
      old_value: { status: "completed", sale_number: sale.sale_number },
      new_value: { status: action === "void" ? "voided" : "refunded" },
      reason,
    })

    // Journal
    await db.from("journal").insert({
      id: uuid(),
      store_id: session.storeId,
      event_type: `sale_${action}ed`,
      sale_id: saleId,
      employee_id: session.employeeId,
      details: {
        sale_number: sale.sale_number,
        previous_status: "completed",
        new_status: action === "void" ? "voided" : "refunded",
        reason,
        items_restocked: (saleItems ?? []).map(i => ({ name: i.item_name, qty: Number(i.deducted_qty) })),
      },
    })

    return NextResponse.json({
      success: true,
      sale: { id: saleId, status: action === "void" ? "voided" : "refunded" },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: `Internal server error` }, { status: 500 })
  }
}
