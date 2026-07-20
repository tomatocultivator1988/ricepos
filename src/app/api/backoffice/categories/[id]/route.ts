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

    const { data: category } = await db
      .from("categories")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()

    if (!category) return notfind("Category not found")

    return NextResponse.json({ category })
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
      .from("categories")
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Category not found")

    const body = await request.json()
    const { name, sortOrder, color } = body

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (sortOrder !== undefined) updateData.sort_order = Number(sortOrder)
    if (color !== undefined) updateData.color = color || null

    const { data: updated } = await db
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single()

    return NextResponse.json({ category: updated })
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
      .from("categories")
      .select("id, name")
      .eq("id", id)
      .eq("store_id", storeId)
      .single()
    if (!existing) return notfind("Category not found")

    // Block delete if items reference this category
    const { data: refs } = await db.from("items")
      .select("id").eq("category_id", id).eq("store_id", storeId).limit(1)
    if (refs && refs.length > 0) {
      return NextResponse.json({ error: "Cannot delete category referenced by items" }, { status: 400 })
    }

    await db
      .from("categories")
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
