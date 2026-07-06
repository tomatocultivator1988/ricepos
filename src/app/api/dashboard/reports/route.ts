import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const url = new URL(request.url)
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")

    let query = db.from("sales")
      .select("id, total, subtotal, tax_total, discount_amt, status, void_reason, employee_id, sale_number, created_at, employees!inner(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })

    if (from) query = query.gte("created_at", from)
    if (to) query = query.lte("created_at", to + "T23:59:59.999Z")

    const { data: sales } = await query.limit(500)

    const allSales = sales ?? []

    // Compute reports
    const completed = allSales.filter((s: any) => s.status === "completed" || s.status === "refunded")
    const voided = allSales.filter((s: any) => s.status === "voided")
    const refunded = allSales.filter((s: any) => s.status === "refunded")

    const grossSales = completed.reduce((sum: number, s: any) => sum + Number(s.subtotal), 0)
    const totalVAT = completed.reduce((sum: number, s: any) => sum + Number(s.tax_total), 0)
    const totalDiscount = completed.reduce((sum: number, s: any) => sum + Number(s.discount_amt), 0)
    const netSales = grossSales - totalDiscount
    const voidTotal = voided.reduce((sum: number, s: any) => sum + Number(s.total), 0)
    const refundTotal = refunded.reduce((sum: number, s: any) => sum + Number(s.total), 0)

    // Per cashier report
    const cashierMap = new Map<string, { name: string; count: number; total: number }>()
    for (const s of completed) {
      const name = (s as any).employees?.name || "Unknown"
      if (!cashierMap.has(name)) cashierMap.set(name, { name, count: 0, total: 0 })
      const entry = cashierMap.get(name)!
      entry.count++
      entry.total += Number(s.total)
    }

    // Void reasons breakdown
    const voidReasons: Record<string, number> = {}
    for (const s of voided) {
      const r = s.void_reason || "No reason"
      voidReasons[r] = (voidReasons[r] || 0) + 1
    }

    // Discount breakdown
    const { data: discData } = await db.from("discounts").select("name, type, value").eq("store_id", storeId)
    const discounts = discData ?? []

    return NextResponse.json({
      summary: {
        grossSales: Number(grossSales.toFixed(2)),
        vatCollected: Number(totalVAT.toFixed(2)),
        vatExemptSales: 0,
        discountsGiven: Number(totalDiscount.toFixed(2)),
        netSales: Number(netSales.toFixed(2)),
        totalTransactions: completed.length,
        voidedCount: voided.length,
        voidedTotal: Number(voidTotal.toFixed(2)),
        refundedCount: refunded.length,
        refundedTotal: Number(refundTotal.toFixed(2)),
      },
      cashiers: Array.from(cashierMap.values()),
      voidReasons: Object.entries(voidReasons).map(([r, c]) => ({ reason: r, count: c })),
      discounts,
      recentSales: allSales.slice(0, 10).map((s: any) => ({
        id: s.id,
        saleNumber: s.sale_number,
        total: Number(s.total),
        subtotal: Number(s.subtotal),
        taxTotal: Number(s.tax_total),
        discountAmt: Number(s.discount_amt),
        status: s.status,
        cashier: (s as any).employees?.name || "Unknown",
        createdAt: s.created_at,
        voidReason: s.void_reason,
      })),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
