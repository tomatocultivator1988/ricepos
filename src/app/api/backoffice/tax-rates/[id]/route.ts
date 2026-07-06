import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: taxRate } = await db
      .from("tax_rates")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()

    if (!taxRate) return notfind("Tax rate not found")

    return NextResponse.json({ taxRate })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found")
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db
      .from("tax_rates")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Tax rate not found")

    const body = await request.json()
    const { name, rate } = body

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      )
    }
    if (rate !== undefined && (isNaN(Number(rate)) || Number(rate) < 0)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Valid rate is required" } },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (rate !== undefined) updateData.rate = Number(rate)

    const { data: updated } = await db
      .from("tax_rates")
      .update(updateData)
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single()

    return NextResponse.json({ taxRate: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found")
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db
      .from("tax_rates")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Tax rate not found")

    await db
      .from("tax_rates")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found")
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
