import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

const DEFAULT_CATEGORIES = ["utilities", "rent", "supplies", "salary", "load", "transport", "other"]

function needsMigrationError() {
  return NextResponse.json({
    categories: DEFAULT_CATEGORIES,
    _hint: "Run supabase/migrations/0006_expense_categories.sql to enable full CRUD",
  })
}

export async function GET() {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data, error } = await db
      .from("expense_categories")
      .select("*")
      .eq("store_id", storeId)
      .order("name", { ascending: true })

    if (error) return needsMigrationError()

    return NextResponse.json({ categories: data ?? [] })
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
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: created, error } = await db
      .from("expense_categories")
      .insert({ id: uuid(), store_id: storeId, name: name.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ category: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
