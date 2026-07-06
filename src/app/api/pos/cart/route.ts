import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const body = await request.json()
    const { shiftId, items, subtotal, taxTotal, total, status } = body

    const cartData = { items: items || [], subtotal, taxTotal, total, status: status || "active" }

    const { data: existing } = await db
      .from("pos_carts")
      .select("id")
      .eq("shift_id", shiftId)
      .limit(1)
      .single()

    if (existing) {
      await db.from("pos_carts")
        .update({ cart_data: cartData, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    } else {
      await db.from("pos_carts").insert({
        shift_id: shiftId,
        cart_data: cartData,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const shiftId = url.searchParams.get("shift_id")

    if (!shiftId) return NextResponse.json({ cart: null })

    const { data } = await db
      .from("pos_carts")
      .select("cart_data, status, updated_at")
      .eq("shift_id", shiftId)
      .limit(1)
      .single()

    if (!data) return NextResponse.json({ cart: null })

    return NextResponse.json({
      cart: { ...(data.cart_data as any), updatedAt: data.updated_at },
    })
  } catch {
    return NextResponse.json({ cart: null })
  }
}
