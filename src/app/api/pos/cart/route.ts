import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { cart_data } = body

    // Use store_id as the cart key (no shifts)
    const cartKey = storeId

    const { data: existing } = await db
      .from("pos_carts")
      .select("id")
      .eq("shift_id", cartKey)
      .limit(1)
      .single()

    if (existing) {
      await db.from("pos_carts")
        .update({ cart_data, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    } else {
      await db.from("pos_carts").insert({
        shift_id: cartKey,
        cart_data,
        status: "active",
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const cartKey = storeId

    const { data } = await db
      .from("pos_carts")
      .select("cart_data, status, updated_at")
      .eq("shift_id", cartKey)
      .limit(1)
      .single()

    if (!data) return NextResponse.json({ cart: null })

    return NextResponse.json({
      cart: {
        cart_data: data.cart_data,
        status: data.status,
        updated_at: data.updated_at,
      }
    })
  } catch {
    return NextResponse.json({ cart: null })
  }
}
