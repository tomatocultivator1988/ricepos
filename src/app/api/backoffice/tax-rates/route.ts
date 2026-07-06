import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: list } = await db
      .from("tax_rates")
      .select("*")
      .eq("store_id", storeId)

    return NextResponse.json({ taxRates: list })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found")
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const body = await request.json()
    const { name, rate } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { name: ["Name is required"] } } },
        { status: 400 }
      )
    }
    if (rate === undefined || isNaN(Number(rate)) || Number(rate) < 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { rate: ["Valid rate is required"] } } },
        { status: 400 }
      )
    }

    const { data: created } = await db
      .from("tax_rates")
      .insert({
        store_id: storeId,
        name: name.trim(),
        rate: String(Number(rate).toFixed(2)),
      })
      .select()
      .single()

    return NextResponse.json({ taxRate: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found")
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
