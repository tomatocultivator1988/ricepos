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
      .select("id, sale_number, created_at, subtotal, discount_amount, tax_total, total, employee_id")
      .eq("id", saleId)
      .eq("store_id", storeId)
      .single()

    if (!sale) return notfind("Sale not found")

    const { data: itemRows } = await db
      .from("sale_items")
      .select("item_name, qty, unit_price, line_total")
      .eq("sale_id", saleId)

    const { data: paymentRows } = await db
      .from("payments")
      .select("method, amount")
      .eq("sale_id", saleId)

    // Get employee name
    let empName = "—"
    if ((sale as any).employee_id) {
      const { data: emp } = await db.from("employees").select("name").eq("id", (sale as any).employee_id).maybeSingle()
      if (emp) empName = (emp as any).name
    }

    return NextResponse.json({
      sale: {
        id: sale.id,
        saleNumber: sale.sale_number,
        createdAt: sale.created_at,
        employeeName: empName,
        items: (itemRows ?? []).map((i: any) => ({
          itemName: i.item_name,
          qty: Number(i.qty),
          unitPrice: Number(i.unit_price),
          lineTotal: Number(i.line_total),
        })),
        subtotal: Number(sale.subtotal),
        discountAmt: Number((sale as any).discount_amount),
        taxTotal: Number(sale.tax_total),
        total: Number(sale.total),
        payments: (paymentRows ?? []).map((p: any) => ({
          method: p.method,
          amount: Number(p.amount),
        })),
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
