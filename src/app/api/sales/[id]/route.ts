import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: sale } = await db
      .from("sales")
      .select("id, status, total, employee_id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()

    if (!sale) return notfind("Sale not found")

    const body = await request.json()
    const { action, reason } = body

    if (action === "void") {
      if (sale.status === "voided") return NextResponse.json({ error: "Already voided" }, { status: 400 })

      await db.from("sales")
        .update({ status: "voided", void_reason: reason || "Voided by cashier", updated_at: new Date().toISOString() })
        .eq("id", id)

      await db.from("journal").insert({
        store_id: storeId, sale_id: id, event_type: "void_transaction",
        employee_id: session.employeeId,
        details: { reason: reason || "Voided by cashier", original_total: Number(sale.total) },
      })

      await db.from("audit_log").insert({
        store_id: storeId, employee_id: session.employeeId,
        action: "void_transaction", entity_type: "sale", entity_id: id,
        old_value: { status: "completed", total: Number(sale.total) },
        new_value: { status: "voided", reason: reason || "Voided" },
      })

      return NextResponse.json({ success: true, action: "voided" })
    }

    if (action === "refund") {
      if (sale.status === "refunded") return NextResponse.json({ error: "Already refunded" }, { status: 400 })

      const { data: items } = await db
        .from("sale_items")
        .select("item_id, item_name, qty, status")
        .eq("sale_id", id)

      for (const si of (items ?? [])) {
        if (si.status === "refunded") continue

        await db.from("sale_items")
          .update({ status: "refunded", void_reason: reason || "Refunded" })
          .eq("sale_id", id)
          .eq("item_id", si.item_id)

        const { data: item } = await db
          .from("items")
          .select("stock_qty, track_stock")
          .eq("id", si.item_id)
          .single()

        if (item && item.track_stock) {
          const newQty = Number(item.stock_qty) + Number(si.qty)
          await db.from("items")
            .update({ stock_qty: String(newQty), updated_at: new Date().toISOString() })
            .eq("id", si.item_id)
        }

        // Restore ingredient stock via DB recipe (same logic as sale deduction but reversed)
        let variantId: string | undefined = undefined
        const { data: variants } = await db
          .from("product_variants")
          .select("id")
          .eq("product_id", si.item_id)
          .limit(1)
        if (variants && variants.length > 0) {
          variantId = variants[0].id
        }

        if (variantId) {
          const { data: recipe } = await db
            .from("product_ingredients")
            .select("ingredient_id, quantity, items!inner(id, stock_qty, track_stock)")
            .eq("product_variant_id", variantId)

          if (recipe && recipe.length > 0) {
            for (const ing of recipe) {
              const ingredient = (ing.items as unknown) as { id: string; stock_qty: number; track_stock: boolean } | null
              if (!ingredient || !ingredient.track_stock) continue

              const currentQty = Number(ingredient.stock_qty)
              const restoreQty = Number(ing.quantity) * Number(si.qty)
              const newQty = currentQty + restoreQty

              await db.from("items")
                .update({ stock_qty: String(Math.round(newQty * 1000) / 1000), updated_at: new Date().toISOString() })
                .eq("id", ingredient.id)

              await db.from("inventory_log").insert({
                store_id: storeId,
                item_id: ingredient.id,
                change_qty: String(restoreQty),
                qty_after: String(Math.round(newQty * 1000) / 1000),
                reason: "refund",
                source_id: id,
                employee_id: session.employeeId,
                note: "Refunded: " + si.item_name,
              })
            }
          }
        }
      }

      await db.from("sales")
        .update({ status: "refunded", void_reason: reason || "Refunded", updated_at: new Date().toISOString() })
        .eq("id", id)

      await db.from("journal").insert({
        store_id: storeId, sale_id: id, event_type: "refund",
        employee_id: session.employeeId,
        details: { reason: reason || "Refunded", original_total: Number(sale.total) },
      })

      await db.from("audit_log").insert({
        store_id: storeId, employee_id: session.employeeId,
        action: "refund", entity_type: "sale", entity_id: id,
        old_value: { status: "completed", total: Number(sale.total) },
        new_value: { status: "refunded", reason: reason || "Refunded" },
      })

      return NextResponse.json({ success: true, action: "refunded" })
    }

    if (action === "return_exchange") {
      const { returnItemId, exchangeItemName } = body

      await db.from("sale_items")
        .update({ status: "returned", void_reason: reason || "Returned" })
        .eq("sale_id", id)
        .eq("item_id", returnItemId)

      await db.from("journal").insert({
        store_id: storeId, sale_id: id, event_type: "return_exchange",
        employee_id: session.employeeId,
        details: { reason: reason || "Return/Exchange", returned_item: returnItemId, exchanged_for: exchangeItemName },
      })

      return NextResponse.json({ success: true, action: "returned" })
    }

    if (action === "void_line") {
      const { itemId, lineReason } = body
      if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 })

      const { data: lineItem } = await db
        .from("sale_items")
        .select("id, item_id, qty, total")
        .eq("sale_id", id)
        .eq("item_id", itemId)
        .single()

      if (!lineItem) return notfind("Line item not found")

      await db.from("sale_items")
        .update({ status: "voided", void_reason: lineReason || "Voided" })
        .eq("sale_id", id)
        .eq("item_id", itemId)

      await db.from("journal").insert({
        store_id: storeId, sale_id: id, event_type: "void_line",
        employee_id: session.employeeId,
        details: { item_id: itemId, reason: lineReason || "Voided", qty: Number(lineItem.qty) },
      })

      return NextResponse.json({ success: true, action: "line_voided" })
    }

    return NextResponse.json({ error: "Invalid action. Use: void, refund, void_line, return_exchange" }, { status: 400 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Sale not found") return notfind("Sale not found")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
