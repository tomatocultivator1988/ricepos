import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, forbid } from "@/lib/auth/session"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const { id } = await params

    const { data } = await db
      .from("product_ingredients")
      .select("id, product_variant_id, ingredient_id, quantity, created_at, items!inner(name)")
      .eq("product_variant_id", id)

    return NextResponse.json({
      ingredients: (data ?? []).map((i: any) => ({
        id: i.id,
        variantId: i.product_variant_id,
        ingredientId: i.ingredient_id,
        ingredientName: i.items?.name || "Unknown",
        quantity: Number(i.quantity),
      })),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const { id } = await params
    const body = await request.json()
    const { ingredientId, quantity, variantId } = body

    if (!ingredientId || !quantity || !variantId) {
      return NextResponse.json({ error: "ingredientId, quantity, and variantId required" }, { status: 400 })
    }

    const { data } = await db
      .from("product_ingredients")
      .insert({
        product_variant_id: variantId,
        ingredient_id: ingredientId,
        quantity: String(quantity),
      })
      .select("id, product_variant_id, ingredient_id, quantity, items!inner(name)")
      .single()

    if (!data) return NextResponse.json({ error: "Failed to create" }, { status: 500 })

    return NextResponse.json({
      id: data.id,
      variantId: data.product_variant_id,
      ingredientId: data.ingredient_id,
      ingredientName: (data.items as any)?.name || "Unknown",
      quantity: Number(data.quantity),
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  _: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const url = new URL(request.url)
    const ingredientId = url.searchParams.get("id")
    if (!ingredientId) return NextResponse.json({ error: "id required" }, { status: 400 })

    await db.from("product_ingredients").delete().eq("id", ingredientId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
