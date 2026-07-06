import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { saleId } = await params

    const { data: sale } = await db
      .from("sales")
      .select("id, sale_number, created_at, subtotal, discount_amt, tax_total, total, employees(name)")
      .eq("id", saleId)
      .eq("store_id", storeId)
      .single()

    if (!sale) return notfind("Sale not found")

    const { data: itemRows } = await db
      .from("sale_items")
      .select("item_name, qty, unit_price, total")
      .eq("sale_id", saleId)

    const { data: paymentRows } = await db
      .from("payments")
      .select("method, amount")
      .eq("sale_id", saleId)

    return NextResponse.json({
      sale: {
        id: sale.id,
        saleNumber: sale.sale_number,
        createdAt: sale.created_at,
        employeeName: (sale.employees as any)?.name ?? "\u2014",
        items: (itemRows ?? []).map((i: Record<string, any>) => ({
          itemName: i.item_name,
          qty: Number(i.qty),
          unitPrice: Number(i.unit_price),
          lineTotal: Number(i.total),
        })),
        subtotal: Number(sale.subtotal),
        discountAmt: Number(sale.discount_amt),
        taxTotal: Number(sale.tax_total),
        total: Number(sale.total),
        payments: (paymentRows ?? []).map((p: Record<string, any>) => ({
          method: p.method,
          amount: Number(p.amount),
        })),
        paymentMethod: paymentRows?.[0]?.method ?? "cash",
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return notfind("Store not found")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
