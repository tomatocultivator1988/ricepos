import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { counted, notes } = await request.json()
    if (counted === undefined) return NextResponse.json({ error: "Counted amount required" }, { status: 400 })

    const today = new Date().toISOString().split("T")[0]
    const { data: cashPayments } = await db.from("payments")
      .select("amount").eq("method", "cash").eq("is_collection", false)
      .gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`)
    const systemTotal = (cashPayments ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0)
    const variance = Number(counted) - systemTotal

    const { data: created } = await db.from("cash_counts").insert({
      id: uuid(), store_id: storeId, date: today,
      system_total: systemTotal, counted_amount: Number(counted), variance, notes: notes || null,
      employee_id: session.employeeId,
    }).select().single()

    return NextResponse.json({ cashCount: created })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { data: counts } = await db.from("cash_counts")
      .select("*").eq("store_id", storeId).order("date", { ascending: false }).limit(30)
    return NextResponse.json({ cashCounts: counts ?? [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
