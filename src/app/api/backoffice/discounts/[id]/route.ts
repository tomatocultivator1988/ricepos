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

    const { data: discount } = await db
      .from("discounts")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()

    if (!discount) return notfind("Discount not found")

    return NextResponse.json({ discount })
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
      .from("discounts")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Discount not found")

    const body = await request.json()
    const { name, type, value, isActive } = body

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      )
    }
    if (type !== undefined && !["percentage", "fixed"].includes(type)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Type must be 'percentage' or 'fixed'" } },
        { status: 400 }
      )
    }
    if (value !== undefined && (isNaN(Number(value)) || Number(value) < 0)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Valid value is required" } },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (type !== undefined) updateData.type = type
    if (value !== undefined) updateData.value = String(Number(value).toFixed(2))
    if (isActive !== undefined) updateData.is_active = isActive

    const { data: updated } = await db
      .from("discounts")
      .update(updateData)
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single()

    return NextResponse.json({ discount: updated })
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
      .from("discounts")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Discount not found")

    await db
      .from("discounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
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
