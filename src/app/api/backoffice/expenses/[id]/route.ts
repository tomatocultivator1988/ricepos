import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params
    const body = await request.json()
    const { date, category, description, amount } = body

    if (!category) return NextResponse.json({ error: "Category required" }, { status: 400 })
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 })

    const { data, error } = await db
      .from("expenses")
      .update({
        date: date || new Date().toISOString().split("T")[0],
        category,
        description: description || null,
        amount: Number(amount),
      })
      .eq("id", id)
      .eq("store_id", storeId)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    return NextResponse.json({ expense: data[0] })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data, error } = await db
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
