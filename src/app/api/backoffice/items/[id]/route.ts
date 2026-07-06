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
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Item not found")

    const body = await request.json()
    const { name, price, cost, sku, barcode, categoryId, taxRateId, trackStock, stockQty, minStock, imageUrl, isActive } = body

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Name is required" } }, { status: 400 })
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Valid price is required" } }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (price !== undefined) updateData.price = String(Number(price).toFixed(2))
    if (cost !== undefined) updateData.cost = cost !== "" ? String(Number(cost).toFixed(2)) : "0"
    if (sku !== undefined) updateData.sku = sku || null
    if (barcode !== undefined) updateData.barcode = barcode || null
    if (categoryId !== undefined) updateData.category_id = categoryId || null
    if (taxRateId !== undefined) updateData.tax_rate_id = taxRateId || null
    if (trackStock !== undefined) updateData.track_stock = trackStock
    if (stockQty !== undefined) updateData.stock_qty = String(stockQty)
    if (minStock !== undefined) updateData.min_stock = String(minStock)
    if (imageUrl !== undefined) updateData.image_url = imageUrl || null
    if (isActive !== undefined) updateData.is_active = isActive

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
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Item not found")

    await db.from("items")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", storeId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
