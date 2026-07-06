import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"
import { hash } from "bcryptjs"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db.from("employees")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Employee not found")

    const body = await request.json()
    const { name, role, pin, isActive } = body

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Name is required" } }, { status: 400 })
    }
    if (role !== undefined && !["admin", "cashier"].includes(role)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Valid role is required (admin or cashier)" } }, { status: 400 })
    }
    if (pin !== undefined && pin !== null && pin !== "" && (typeof pin !== "string" || !/^\d{4}$/.test(pin))) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "PIN must be 4 digits" } }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (role !== undefined) updateData.role = role
    if (pin !== undefined && pin !== null && pin !== "") {
      updateData.pin_hash = await hash(pin as string, 10)
    }
    if (isActive !== undefined) updateData.is_active = isActive

    const { data: updated } = await db.from("employees")
      .update(updateData as any)
      .eq("id", id)
      .eq("store_id", storeId)
      .select("id, store_id, name, role, is_active, created_at, updated_at")
      .single()

    return NextResponse.json({ employee: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db.from("employees")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Employee not found")

    await db.from("employees")
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .eq("store_id", storeId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
