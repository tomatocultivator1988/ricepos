import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const from = request.nextUrl.searchParams.get("from")
    const to = request.nextUrl.searchParams.get("to")
    const category = request.nextUrl.searchParams.get("category")

    let query = db.from("expenses").select("*").eq("store_id", storeId)
    if (from) query = query.gte("date", from)
    if (to) query = query.lte("date", to)
    if (category && category !== "all") query = query.eq("category", category)
    query = query.order("date", { ascending: false })

    const { data: expenses } = await query
    return NextResponse.json({ expenses: expenses ?? [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { date, category, description, amount } = body

    if (!category) return NextResponse.json({ error: "Category required" }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 })

    const { data: created, error } = await db.from("expenses").insert({
      id: uuid(), store_id: storeId, date: date || new Date().toISOString().split("T")[0],
      category, description: description || null, amount: Number(amount),
      created_by: session.employeeId,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ expense: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
