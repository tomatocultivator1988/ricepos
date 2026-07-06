import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: list } = await db
      .from("discounts")
      .select("*")
      .eq("store_id", storeId)

    return NextResponse.json({ discounts: list })
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
    const { name, type, value } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { name: ["Name is required"] } } },
        { status: 400 }
      )
    }
    if (!type || !["percentage", "fixed"].includes(type)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { type: ["Type must be 'percentage' or 'fixed'"] } } },
        { status: 400 }
      )
    }
    if (value === undefined || isNaN(Number(value)) || Number(value) < 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { value: ["Valid value is required"] } } },
        { status: 400 }
      )
    }

    const { data: created } = await db
      .from("discounts")
      .insert({
        store_id: storeId,
        name: name.trim(),
        type,
        value: Number(value),
      })
      .select()
      .single()

    return NextResponse.json({ discount: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found")
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
