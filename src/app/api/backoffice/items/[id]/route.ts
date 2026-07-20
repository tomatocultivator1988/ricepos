import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: item } = await db.from("items")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()

    if (!item) return notfind("Item not found")

    return NextResponse.json({ item })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db.from("items")
      .select("id, is_consignment, consignment_agreed_price, cost, stock_qty")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Item not found")

    const body = await request.json()
    const { name, price, cost, sku, barcode, categoryId, taxRateId, trackStock, stockQty, minStock, imageUrl, isActive, isConsignment, consignmentSupplierId, consignmentAgreedPrice, sellBy, discountEligible } = body

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Name is required" } }, { status: 400 })
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Valid price is required" } }, { status: 400 })
    }
    if (cost !== undefined && (isNaN(Number(cost)) || Number(cost) < 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Cost must be 0 or positive" } }, { status: 400 })
    }
    if (stockQty != null && (isNaN(Number(stockQty)) || Number(stockQty) < 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Stock quantity must be 0 or positive" } }, { status: 400 })
    }
    if (minStock != null && (isNaN(Number(minStock)) || Number(minStock) < 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Min stock must be 0 or positive" } }, { status: 400 })
    }
    if (consignmentAgreedPrice !== undefined && (isNaN(Number(consignmentAgreedPrice)) || Number(consignmentAgreedPrice) < 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Consignment agreed price must be a valid positive number" } }, { status: 400 })
    }

    const wasConsignment = existing.is_consignment ?? false
    const newIsConsignment = isConsignment ?? wasConsignment
    const currentStockQty = Number(existing.stock_qty ?? 0)
    const currentAgreedPrice = Number(existing.consignment_agreed_price ?? 0)

    // Block enabling consignment on items with existing stock
    if (newIsConsignment && !wasConsignment && currentStockQty > 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot enable consignment on an item with existing stock. Zero out stock first." } },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (price !== undefined) updateData.price = String(Number(price).toFixed(2))
    if (sellBy !== undefined) updateData.sell_by = sellBy
    if (discountEligible !== undefined) updateData.discount_eligible = discountEligible
    if (sku !== undefined) updateData.sku = sku || null
    if (barcode !== undefined) {
      if (barcode) {
        const { data: dup } = await db.from("items")
          .select("id").eq("barcode", barcode).neq("id", id).maybeSingle()
        if (dup) return NextResponse.json(
          { error: { code: "DUPLICATE", message: "A product with this barcode already exists" } },
          { status: 409 }
        )
      }
      updateData.barcode = barcode || null
    }
    if (categoryId !== undefined) updateData.category_id = categoryId || null
    if (taxRateId !== undefined) updateData.tax_rate_id = taxRateId || null
    if (trackStock !== undefined) updateData.track_stock = trackStock
    if (stockQty != null) updateData.stock_qty = String(Number(stockQty))
    if (minStock != null) updateData.min_stock = String(Number(minStock))
    if (imageUrl !== undefined) updateData.image_url = imageUrl || null
    if (isActive !== undefined) updateData.status = isActive ? "active" : "inactive"
    if (isConsignment !== undefined) updateData.is_consignment = isConsignment
    if (consignmentSupplierId !== undefined) updateData.consignment_supplier_id = consignmentSupplierId || null
    if (consignmentAgreedPrice !== undefined) updateData.consignment_agreed_price = Number(consignmentAgreedPrice)

    // Auto-sync cost with consignment agreed price using merged state
    if (cost !== undefined) {
      updateData.cost = cost !== "" ? String(Number(cost).toFixed(2)) : "0"
    } else if (newIsConsignment) {
      const mergedPrice = consignmentAgreedPrice !== undefined ? Number(consignmentAgreedPrice) : currentAgreedPrice
      if (mergedPrice > 0) updateData.cost = String(mergedPrice.toFixed(2))
    }

    const { data: updated } = await db.from("items")
      .update(updateData)
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single()

    return NextResponse.json({ item: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db.from("items")
      .select("id, name")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Item not found")

    // Check for open POs referencing this item
    const { data: openPOs } = await db.from("purchase_order_items")
      .select("po_id").eq("item_id", id).limit(1)
    const { data: openPOs2 } = await db.from("purchase_orders")
      .select("id").eq("store_id", storeId).in("status", ["ordered", "partial"])
    const openPoIds = new Set((openPOs2 ?? []).map((p: any) => p.id))
    if ((openPOs ?? []).some((p: any) => openPoIds.has(p.po_id))) {
      return NextResponse.json({ error: "Cannot delete item with open purchase orders" }, { status: 400 })
    }

    await db.from("items")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", storeId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
