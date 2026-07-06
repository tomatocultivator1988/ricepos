import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind, forbid } from "@/lib/auth/session"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const { id } = await params

    const { data } = await db
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("price", { ascending: true })

    return NextResponse.json({
      variants: (data ?? []).map((v: any) => ({
        id: v.id,
        productId: v.product_id,
        sizeLabel: v.size_label,
        price: Number(v.price),
        isActive: v.is_active,
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
    const { sizeLabel, price } = body

    if (!sizeLabel || !price) {
      return NextResponse.json({ error: "sizeLabel and price required" }, { status: 400 })
    }

    const { data } = await db
      .from("product_variants")
      .insert({ product_id: id, size_label: sizeLabel, price: String(price) })
      .select()
      .single()

    return NextResponse.json(
      { id: data.id, productId: data.product_id, sizeLabel: data.size_label, price: Number(data.price) },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const url = new URL(request.url)
    const variantId = url.searchParams.get("variantId")
    if (!variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 })

    await db.from("product_variants").delete().eq("id", variantId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
