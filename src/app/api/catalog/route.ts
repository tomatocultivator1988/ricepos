import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const [itemsRes, catsRes, taxRes, discRes, custRes, storeRes, variantsRes] = await Promise.all([
      db.from("items").select("*").eq("store_id", storeId),
      db.from("categories").select("*").eq("store_id", storeId),
      db.from("tax_rates").select("*").eq("store_id", storeId),
      db.from("discounts").select("*").eq("store_id", storeId).eq("is_active", true),
      db.from("customers").select("*").eq("store_id", storeId),
      db.from("stores").select("*").eq("id", storeId).single(),
      db.from("product_variants").select("*").eq("is_active", true),
    ])

    const store = storeRes.data

    return NextResponse.json({
      store: store ? {
        id: store.id, name: store.name, currency: store.currency,
        currencySymbol: store.currency_symbol, taxName: store.tax_name,
        receiptHeader: store.receipt_header, receiptFooter: store.receipt_footer,
        defaultTaxRateId: store.default_tax_rate_id,
      } : null,
      items: itemsRes.data ?? [],
      categories: catsRes.data ?? [],
      taxRates: taxRes.data ?? [],
      discounts: discRes.data ?? [],
      customers: custRes.data ?? [],
      variants: (variantsRes.data ?? []).map((v: any) => ({
        id: v.id,
        productId: v.product_id,
        sizeLabel: v.size_label,
        price: Number(v.price),
      })),
      serverTime: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
