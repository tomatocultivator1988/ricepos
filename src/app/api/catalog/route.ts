import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: items } = await db.from("items")
      .select(`
        id, name, category_id, sell_by, cost, barcode,
        stock_qty, min_stock, tax_rate_id, discount_eligible,
        status, image_url,
        selling_units(id, name, base_qty, price, min_qty, is_default, sort_order, is_active)
      `)
      .eq("store_id", storeId)
      .eq("status", "active")
      .filter("selling_units.is_active", "eq", true)

    const formatted = (items ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      sell_by: item.sell_by,
      cost: item.cost,
      barcode: item.barcode,
      stock_qty: item.stock_qty,
      min_stock: item.min_stock,
      tax_rate_id: item.tax_rate_id,
      discount_eligible: item.discount_eligible,
      image_url: item.image_url,
      status: item.status,
      stock_status: item.stock_qty <= 0 ? "out"
        : item.stock_qty <= item.min_stock ? "low" : "ok",
      units: (item.selling_units ?? [])
        .filter((u: any) => u.is_active)
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
      default_price: (item.selling_units ?? [])
        .find((u: any) => u.is_active && u.is_default)?.price
        ?? (item.selling_units ?? []).find((u: any) => u.is_active)?.price
        ?? 0,
    }))

    return NextResponse.json({ items: formatted })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
