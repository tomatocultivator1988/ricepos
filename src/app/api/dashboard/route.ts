import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

function todayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const start = todayStart()

    const { data: todaySales } = await db
      .from("sales")
      .select("total, created_at, id")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", start.toISOString())

    const completedSales = todaySales ?? []

    let totalSales = 0
    let orderCount = completedSales.length
    for (const s of completedSales as Record<string, any>[]) {
      totalSales += Number(s.total)
    }
    const avg = orderCount > 0 ? Number((totalSales / orderCount).toFixed(2)) : 0

    const saleIds = (completedSales as Record<string, any>[]).map((s: Record<string, any>) => s.id)
    let cashTotal = 0
    let cardTotal = 0

    if (saleIds.length > 0) {
      const { data: paymentRows } = await db
        .from("payments")
        .select("method, amount")
        .in("sale_id", saleIds)

      for (const p of paymentRows as Record<string, any>[] ?? []) {
        if (p.method === "cash") cashTotal += Number(p.amount)
        else if (p.method === "card") cardTotal += Number(p.amount)
      }
    }

    const hourlyMap = new Map<number, { total: number; count: number }>()
    for (const s of completedSales as Record<string, any>[]) {
      const hour = new Date(s.created_at).getHours()
      const entry = hourlyMap.get(hour) ?? { total: 0, count: 0 }
      entry.total += Number(s.total)
      entry.count += 1
      hourlyMap.set(hour, entry)
    }

    const hourlySales = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, data]) => ({
        hour: `${String(hour).padStart(2, "0")}:00`,
        total: Number(data.total.toFixed(2)),
        count: data.count,
      }))

    let topItems: { itemName: string; qty: number; total: number }[] = []
    if (saleIds.length > 0) {
      const { data: itemRows } = await db
        .from("sale_items")
        .select("item_name, qty, total")
        .in("sale_id", saleIds)

      const itemMap = new Map<string, { qty: number; total: number }>()
      for (const row of itemRows as Record<string, any>[] ?? []) {
        const entry = itemMap.get(row.item_name) ?? { qty: 0, total: 0 }
        entry.qty += Number(row.qty)
        entry.total += Number(row.total)
        itemMap.set(row.item_name, entry)
      }

      topItems = Array.from(itemMap.entries())
        .sort(([, a], [, b]) => b.qty - a.qty)
        .slice(0, 5)
        .map(([itemName, data]) => ({
          itemName,
          qty: data.qty,
          total: Number(data.total.toFixed(2)),
        }))
    }

    return NextResponse.json({
      today: {
        totalSales: Number(totalSales.toFixed(2)),
        orderCount,
        averageOrder: avg,
        cashTotal: Number(cashTotal.toFixed(2)),
        cardTotal: Number(cardTotal.toFixed(2)),
      },
      hourlySales,
      topItems,
      recentSales: (completedSales as Record<string, any>[]).slice(0, 5).map(s => ({
        saleNumber: s.sale_number,
        total: Number(s.total),
        createdAt: s.created_at,
        paymentMethod: "cash",
      })),
      items: await db.from("items").select("*").eq("store_id", storeId).then(r => r.data ?? []),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
