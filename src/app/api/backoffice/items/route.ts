import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, validationErr } from "@/lib/auth/session"
import { z } from "zod"

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category_id: z.string().uuid().nullable().optional(),
  sell_by: z.enum(["weight", "unit"]),
  cost: z.number().min(0).optional(),
  barcode: z.string().nullable().optional(),
  stock_qty: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional(),
  tax_rate_id: z.string().uuid().nullable().optional(),
  discount_eligible: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  image_url: z.string().nullable().optional(),
  is_consignment: z.boolean().optional(),
  consignment_supplier_id: z.string().uuid().nullable().optional(),
  consignment_agreed_price: z.number().min(0).optional(),
})

const updateSchema = itemSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { searchParams } = request.nextUrl
    const includeInactive = searchParams.get("includeInactive") === "true"
    const search = searchParams.get("q") || ""
    const categoryId = searchParams.get("category_id")

    let query = db.from("items").select("*, selling_units(*)").eq("store_id", storeId)
    if (!includeInactive) query = query.eq("status", "active")
    if (categoryId) query = query.eq("category_id", categoryId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`)
    }

    const [
      { data: items },
      { data: categories },
      { data: taxRates },
    ] = await Promise.all([
      query,
      db.from("categories").select("id, name").eq("store_id", storeId),
      db.from("tax_rates").select("id, name").eq("store_id", storeId),
    ])

    return NextResponse.json({
      items: items ?? [],
      categories: categories ?? [],
      taxRates: taxRates ?? [],
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()

    const parsed = itemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check barcode uniqueness if provided (barcode is globally UNIQUE)
    if (data.barcode) {
      const { data: existing } = await db.from("items")
        .select("id")
        .eq("barcode", data.barcode)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: { code: "DUPLICATE", message: "A product with this barcode already exists" } },
          { status: 409 }
        )
      }
    }

    if (data.is_consignment && data.stock_qty && data.stock_qty > 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot create consignment item with existing stock. Set stock to 0 first." } },
        { status: 400 }
      )
    }
    const effectiveCost = data.is_consignment ? (data.consignment_agreed_price ?? data.cost ?? 0) : (data.cost ?? 0)

    const { data: created, error } = await db.from("items").insert({
      store_id: storeId,
      name: data.name.trim(),
      category_id: data.category_id ?? null,
      sell_by: data.sell_by,
      cost: effectiveCost,
      barcode: data.barcode ?? null,
      stock_qty: data.stock_qty ?? 0,
      min_stock: data.min_stock ?? 0,
      tax_rate_id: data.tax_rate_id ?? null,
      discount_eligible: data.discount_eligible ?? true,
      status: data.status ?? "active",
      image_url: data.image_url ?? null,
      is_consignment: data.is_consignment ?? false,
      consignment_supplier_id: data.consignment_supplier_id ?? null,
      consignment_agreed_price: data.consignment_agreed_price ?? null,
    }).select().single()

    if (error) {
      return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 400 })
    }

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Item ID is required" } }, { status: 400 })
    }

    const parsed = updateSchema.safeParse(fields)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Barcode uniqueness check (exclude this item)
    if (data.barcode) {
      const { data: existing } = await db.from("items")
        .select("id")
        .eq("barcode", data.barcode)
        .neq("id", id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: { code: "DUPLICATE", message: "A product with this barcode already exists" } },
          { status: 409 }
        )
      }
    }

    // Fetch existing state for merged consignment sync logic
    const { data: current } = await db.from("items")
      .select("is_consignment, consignment_agreed_price, cost, stock_qty")
      .eq("id", id).eq("store_id", storeId).single()

    const wasConsignment = current?.is_consignment ?? false
    const newIsConsignment = data.is_consignment ?? wasConsignment
    const currentStockQty = Number(current?.stock_qty ?? 0)
    const currentAgreedPrice = Number(current?.consignment_agreed_price ?? 0)

    // Block enabling consignment on items with existing stock
    if (newIsConsignment && !wasConsignment && currentStockQty > 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot enable consignment on an item with existing stock. Zero out stock first." } },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.category_id !== undefined) updateData.category_id = data.category_id
    if (data.sell_by !== undefined) updateData.sell_by = data.sell_by
    if (data.barcode !== undefined) updateData.barcode = data.barcode
    if (data.stock_qty !== undefined) updateData.stock_qty = data.stock_qty
    if (data.min_stock !== undefined) updateData.min_stock = data.min_stock
    if (data.tax_rate_id !== undefined) updateData.tax_rate_id = data.tax_rate_id
    if (data.discount_eligible !== undefined) updateData.discount_eligible = data.discount_eligible
    if (data.status !== undefined) updateData.status = data.status
    if (data.image_url !== undefined) updateData.image_url = data.image_url
    if (data.is_consignment !== undefined) updateData.is_consignment = data.is_consignment
    if (data.consignment_supplier_id !== undefined) updateData.consignment_supplier_id = data.consignment_supplier_id
    if (data.consignment_agreed_price !== undefined) updateData.consignment_agreed_price = data.consignment_agreed_price

    // Auto-sync cost with consignment agreed price using merged state
    if (data.cost !== undefined) {
      updateData.cost = data.cost
    } else if (newIsConsignment) {
      const mergedPrice = data.consignment_agreed_price ?? currentAgreedPrice
      if (mergedPrice > 0) updateData.cost = mergedPrice
    }

    const { data: updated, error } = await db.from("items")
      .update(updateData)
      .eq("id", id)
      .eq("store_id", storeId)
      .select("*, selling_units(*)")
      .single()

    if (error) {
      return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 400 })
    }

    return NextResponse.json({ item: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
