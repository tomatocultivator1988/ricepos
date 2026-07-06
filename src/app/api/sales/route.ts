import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind, validationErr } from "@/lib/auth/session"
import { z } from "zod"

const saleItemSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  itemName: z.string().min(1),
  unitPrice: z.number().min(0),
  qty: z.number().min(1),
  taxRate: z.number().min(0),
  discountTotal: z.number().min(0),
  taxTotal: z.number().min(0),
  lineTotal: z.number().min(0),
  modifiers: z.string(),
  variantId: z.string().uuid().nullable().optional(),
})

const paymentSchema = z.object({
  id: z.string().uuid(),
  method: z.enum(["cash", "card", "other"]),
  amount: z.number().positive(),
})

const saleSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid().optional(),
  customerId: z.string().uuid().nullable().optional(),
  subtotal: z.number().min(0),
  discountTotal: z.number().min(0),
  taxTotal: z.number().min(0),
  grandTotal: z.number().positive(),
  discountId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(["cash", "card", "other"]),
  amountTendered: z.number().min(0).optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  saleItems: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
})

const batchSchema = z.object({
  sales: z.array(saleSchema),
})

function mapPaymentMethod(method: "cash" | "card" | "other"): "cash" | "card" {
  if (method === "cash") return "cash"
  return method === "card" ? "card" : "cash"
}

function formatZodError(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join(".")
    if (!result[path]) result[path] = []
    result[path].push(issue.message)
  }
  return result
}

async function insertSale(data: z.infer<typeof saleSchema>, storeId: string) {
  const now = new Date().toISOString()

  const { data: sale, error: saleErr } = await db.from("sales")
    .insert({
      id: data.id,
      store_id: data.storeId || storeId,
      employee_id: data.employeeId,
      shift_id: data.shiftId || null,
      customer_id: data.customerId ?? null,
      discount_id: data.discountId ?? null,
      discount_amt: String(data.discountTotal),
      subtotal: String(data.subtotal),
      tax_total: String(data.taxTotal),
      total: String(data.grandTotal),
      status: data.status ?? "completed",
      created_at: data.createdAt ?? now,
      closed_at: now,
    })
    .select()
    .single()

  if (saleErr) throw saleErr

  if (data.saleItems.length > 0) {
    await db.from("sale_items").insert(
      data.saleItems.map((item) => ({
        id: item.id,
        sale_id: data.id,
        item_id: item.itemId,
        item_name: item.itemName,
        qty: String(item.qty),
        unit_price: String(item.unitPrice),
        tax_rate: String(item.taxRate),
        tax_amount: String(item.taxTotal),
        discount_amt: String(item.discountTotal),
        total: String(item.lineTotal),
        modifiers: JSON.parse(item.modifiers),
      })),
    )
  }

  if (data.payments.length > 0) {
    await db.from("payments").insert(
      data.payments.map((p) => ({
        id: p.id,
        sale_id: data.id,
        method: mapPaymentMethod(p.method),
        amount: String(p.amount),
      })),
    )
  }

    // Deduct ingredients from DB recipe
  for (const si of data.saleItems) {
    let variantId: string | undefined = si.variantId ?? undefined

    if (!variantId) {
      const { data: variants } = await db
        .from("product_variants")
        .select("id")
        .eq("product_id", si.itemId)
        .limit(1)
      if (variants && variants.length > 0) {
        variantId = variants[0].id
      }
    }

    if (!variantId) {
      // No recipe — check if this is an outsourced product with direct stock
      const { data: directItem } = await db.from("items")
        .select("id, stock_qty, track_stock, name")
        .eq("id", si.itemId)
        .single()

      if (directItem && directItem.track_stock) {
        const curQty = Number(directItem.stock_qty)
        const newQty = Math.max(0, curQty - si.qty)
        await db.from("items")
          .update({ stock_qty: String(newQty), updated_at: new Date().toISOString() })
          .eq("id", directItem.id)
        await db.from("inventory_log").insert({
          store_id: data.storeId || storeId,
          item_id: directItem.id,
          change_qty: String(-si.qty),
          qty_after: String(newQty),
          reason: "sale",
          source_id: data.id,
          employee_id: data.employeeId,
          note: "Sold " + directItem.name,
        })
      }
      continue
    }

    const { data: recipe } = await db
      .from("product_ingredients")
      .select("id, ingredient_id, quantity, items!inner(id, name, stock_qty, track_stock)")
      .eq("product_variant_id", variantId)

    // If no recipe ingredients and item has track_stock, deduct directly (outsourced products)
    if (!recipe || recipe.length === 0) {
      const { data: directItem } = await db.from("items")
        .select("id, stock_qty, track_stock, name")
        .eq("id", si.itemId)
        .single()

      if (directItem && directItem.track_stock) {
        const curQty = Number(directItem.stock_qty)
        const newQty = Math.max(0, curQty - si.qty)
        await db.from("items")
          .update({ stock_qty: String(newQty), updated_at: new Date().toISOString() })
          .eq("id", directItem.id)
        await db.from("inventory_log").insert({
          store_id: data.storeId || storeId, item_id: directItem.id,
          change_qty: String(-si.qty), qty_after: String(newQty),
          reason: "sale", source_id: data.id, employee_id: data.employeeId,
          note: "Sold " + directItem.name,
        })
      }
      continue
    }

    for (const ing of recipe) {
      const ingredient = (ing.items as unknown) as { id: string; name: string; stock_qty: number; track_stock: boolean } | null
      if (!ingredient || !ingredient.track_stock) continue

      const currentQty = Number(ingredient.stock_qty)
      const deductQty = Number(ing.quantity) * si.qty
      const newQty = Math.max(0, currentQty - deductQty)

      await db.from("items")
        .update({ stock_qty: String(newQty.toFixed(3)), updated_at: new Date().toISOString() })
        .eq("id", ingredient.id)

      await db.from("inventory_log").insert({
        store_id: data.storeId || storeId,
        item_id: ingredient.id,
        change_qty: String(-deductQty),
        qty_after: String(newQty.toFixed(3)),
        reason: "sale",
        source_id: data.id,
        employee_id: data.employeeId,
        note: "Used for " + si.itemName,
      })
    }
  }

return sale
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const body = await request.json()
    const parsed = saleSchema.safeParse(body)
    if (!parsed.success) {
      return validationErr(formatZodError(parsed.error))
    }

    const data = parsed.data

    if (data.storeId && data.storeId !== storeId) {
      return notfind("Store not found")
    }

    const { data: employee } = await db.from("employees")
      .select("id")
      .eq("id", data.employeeId)
      .eq("store_id", storeId)
      .single()
    if (!employee) {
      return notfind("Employee not found")
    }

    if (data.shiftId) {
      const { data: shift } = await db.from("shifts")
        .select("id")
        .eq("id", data.shiftId)
        .eq("store_id", storeId)
        .single()
      if (!shift) {
        return notfind("Shift not found")
      }
    }

    const created = await insertSale(data, storeId)

    await db.from("journal").insert({
      store_id: storeId,
      sale_id: created.id,
      event_type: "sale",
      employee_id: data.employeeId,
      details: {
        sale_number: Number(created.sale_number),
        total: data.grandTotal,
        items: data.saleItems.map(si => ({ name: si.itemName, qty: si.qty })),
        payment_method: data.payments[0]?.method ?? "cash",
      },
    })

    return NextResponse.json({
      id: created.id,
      saleNumber: Number(created.sale_number),
      saleNumberFormatted: String(Number(created.sale_number)).padStart(6, '0'),
      createdAt: created.created_at,
      receipt: {
        id: created.id,
        saleNumber: Number(created.sale_number),
        createdAt: created.created_at,
        employeeName: session.name,
        items: data.saleItems.map(item => ({
          itemName: item.itemName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        subtotal: data.subtotal,
        discountAmt: data.discountTotal,
        taxTotal: data.taxTotal,
        total: data.grandTotal,
        payments: data.payments.map(p => ({ method: p.method, amount: p.amount })),
        paymentMethod: data.payments[0]?.method ?? "cash",
      },
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return notfind("Store not found")
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (error.message === "Employee not found") return notfind("Employee not found")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export { saleSchema, batchSchema, insertSale }
