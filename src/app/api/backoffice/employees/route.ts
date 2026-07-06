import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { hash } from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: employeeList } = await db
      .from("employees")
      .select("id, store_id, name, role, pin_hash, is_active, created_at, updated_at")
      .eq("store_id", storeId)

    return NextResponse.json({ employees: employeeList ?? [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const body = await request.json()
    const { name, role, pin } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { name: ["Name is required"] } } },
        { status: 400 }
      )
    }
    if (!role || !["admin", "cashier"].includes(role)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { role: ["Valid role is required (admin or cashier)"] } } },
        { status: 400 }
      )
    }
    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", errors: { pin: ["4-digit PIN is required"] } } },
        { status: 400 }
      )
    }

    const pinHash = await hash(pin, 10)

    const { data: created } = await db.from("employees").insert({
      store_id: storeId,
      name: name.trim(),
      role,
      pin_hash: pinHash,
    }).select("id, store_id, name, role, pin_hash, is_active, created_at, updated_at")
      .single()

    return NextResponse.json({ employee: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
