import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true"
    const search = request.nextUrl.searchParams.get("q") || ""

    let query = db.from("items").select("*").eq("store_id", storeId)

    if (!includeInactive) {
      query = query.eq("is_active", true)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
    }

    const [
      { data: itemList },
      { data: categoryList },
      { data: taxRateList },
    ] = await Promise.all([
      query,
      db.from("categories").select("id, name").eq("store_id", storeId),
      db.from("tax_rates").select("id, name").eq("store_id", storeId),
    ])

    return NextResponse.json({ items: itemList, categories: categoryList, taxRates: taxRateList })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const body = await request.json()
    const { name, price, cost, sku, barcode, categoryId, taxRateId, trackStock, stockQty, minStock, imageUrl, itemType } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { name: ["Name is required"] } } },
        { status: 400 }
      )
    }

    const { data: created } = await db.from("items").insert({
      store_id: storeId,
      name: name.trim(),
      price: String(Number(price).toFixed(2)),
      cost: cost !== undefined ? String(Number(cost).toFixed(2)) : "0",
      sku: sku || null,
      barcode: barcode || null,
      category_id: categoryId || null,
      tax_rate_id: taxRateId || null,
      track_stock: trackStock !== undefined ? trackStock : true,
      stock_qty: stockQty !== undefined ? String(stockQty) : "0",
      min_stock: minStock !== undefined ? String(minStock) : "0",
      image_url: imageUrl || null,
      item_type: itemType || "product",
    }).select().single()

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
