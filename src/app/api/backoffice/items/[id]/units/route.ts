import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind, validationErr } from "@/lib/auth/session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id: itemId } = await params

    const { data: item } = await db.from("items")
      .select("id, store_id")
      .eq("id", itemId)
      .eq("store_id", session.storeId)
      .single()

    if (!item) return notfind("Item not found")

    const { data: units } = await db.from("selling_units")
      .select("*")
      .eq("item_id", itemId)
      .order("sort_order", { ascending: true })

    return NextResponse.json({ units: units ?? [] })
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
    const { id: itemId } = await params

    const { data: item } = await db.from("items")
      .select("id, store_id, sell_by")
      .eq("id", itemId)
      .eq("store_id", session.storeId)
      .single()

    if (!item) return notfind("Item not found")

    const body = await request.json()
    const { name, base_qty, price, min_qty, is_default, sort_order } = body

    if (!name || typeof name !== "string") {
      return validationErr({ name: ["Unit name is required"] })
    }
    if (base_qty === undefined || Number(base_qty) <= 0) {
      return validationErr({ base_qty: ["Base quantity must be greater than 0"] })
    }
    if (price === undefined || Number(price) < 0) {
      return validationErr({ price: ["Price must be 0 or greater"] })
    }

    // If this is marked as default, unset other defaults
    if (is_default) {
      await db.from("selling_units")
        .update({ is_default: false })
        .eq("item_id", itemId)
    }

    const { data: created, error } = await db.from("selling_units").insert({
      item_id: itemId,
      name: name.trim(),
      base_qty: Number(base_qty),
      price: Number(price),
      min_qty: min_qty !== undefined ? Number(min_qty) : (item.sell_by === "weight" ? 0.001 : 1),
      is_default: is_default ?? false,
      sort_order: sort_order ?? 0,
      is_active: true,
    }).select().single()

    if (error) {
      return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 400 })
    }

    return NextResponse.json({ unit: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id: itemId } = await params

    const body = await request.json()
    const { unitId, name, base_qty, price, min_qty, is_default, sort_order, is_active } = body

    if (!unitId) {
      return validationErr({ unitId: ["Unit ID is required"] })
    }

    // Verify unit belongs to this item
    const { data: unit } = await db.from("selling_units")
      .select("id, item_id")
      .eq("id", unitId)
      .eq("item_id", itemId)
      .single()

    if (!unit) return notfind("Selling unit not found")

    // If setting as default, unset others
    if (is_default) {
      await db.from("selling_units")
        .update({ is_default: false })
        .eq("item_id", itemId)
        .neq("id", unitId)
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (base_qty !== undefined) updateData.base_qty = Number(base_qty)
    if (price !== undefined) updateData.price = Number(price)
    if (min_qty !== undefined) updateData.min_qty = Number(min_qty)
    if (is_default !== undefined) updateData.is_default = is_default
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updated, error } = await db.from("selling_units")
      .update(updateData)
      .eq("id", unitId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 400 })
    }

    return NextResponse.json({ unit: updated })
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
    const { id: itemId } = await params
    const unitId = request.nextUrl.searchParams.get("unitId")

    if (!unitId) {
      return validationErr({ unitId: ["Unit ID is required"] })
    }

    // Soft delete
    const { error } = await db.from("selling_units")
      .update({ is_active: false })
      .eq("id", unitId)
      .eq("item_id", itemId)

    if (error) {
      return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
