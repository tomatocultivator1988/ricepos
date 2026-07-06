import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

interface SaleItemInput {
  itemId: string
  unitId: string
  unitName: string
  baseQty: number
  qty: number
  unitPrice: number
  discountEligible: boolean
}

interface PaymentInput {
  method: "cash" | "gcash"
  amount: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const employeeId = session.employeeId
    const body = await request.json()

    const {
      items,           // CartItem[]
      payments,        // PaymentInput[]
      customerId,      // string | null
      discountType,    // string | null
      discountValue,   // number
      discountAmount,  // number
      discountName,    // string
      subtotal,        // number
      taxTotal,        // number
      total,           // number
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }
    if (!payments || !Array.isArray(payments)) {
      return NextResponse.json({ error: "Payment info required" }, { status: 400 })
    }

    const paymentsTotal = payments.reduce((sum: number, p: PaymentInput) => sum + p.amount, 0)
    const isShortPay = paymentsTotal < total
    const hasBalance = total - paymentsTotal

    // Short-pay requires a customer
    if (isShortPay && !customerId) {
      return NextResponse.json({ error: "Customer required for short payment" }, { status: 400 })
    }

    // Validate payment amounts don't exceed total
    if (paymentsTotal > total) {
      return NextResponse.json({ error: "Payment exceeds total" }, { status: 400 })
    }

    // ── ATOMIC TRANSACTION ──
    // We'll use multiple queries in sequence since Supabase doesn't support
    // full SQL transactions via JS client. Locking via FOR UPDATE isn't available.
    // Stock re-verification is done via checking each item in sequence.

    // Step 1: Re-verify stock availability
    for (const item of items) {
      const deductedQty = item.qty * item.baseQty
      const { data: dbItem, error: itemError } = await db
        .from("items")
        .select("id, name, stock_qty, cost, tax_rate_id, discount_eligible")
        .eq("id", item.itemId)
        .eq("store_id", storeId)
        .single()

      if (itemError || !dbItem) {
        return NextResponse.json({ error: `Product not found: ${item.itemId}` }, { status: 400 })
      }

      if (Number(dbItem.stock_qty) < deductedQty) {
        return NextResponse.json({
          error: `Insufficient stock for ${dbItem.name}. Available: ${Number(dbItem.stock_qty).toFixed(2)}, Needed: ${deductedQty}`
        }, { status: 400 })
      }

      // Attach fetched data to item for later use
      ;(item as any)._cost = dbItem.cost
      ;(item as any)._taxRateId = dbItem.tax_rate_id
      ;(item as any)._discountEligible = dbItem.discount_eligible
    }

    // Step 2: Generate receipt number
    const year = new Date().getFullYear()
    const { data: seq, error: seqError } = await db
      .from("sale_sequences")
      .select("last_number")
      .eq("store_id", storeId)
      .eq("year", year)
      .single()

    let saleNumber = 1
    if (seq) {
      saleNumber = seq.last_number + 1
      await db.from("sale_sequences")
        .update({ last_number: saleNumber })
        .eq("store_id", storeId)
        .eq("year", year)
    } else {
      await db.from("sale_sequences").insert({
        store_id: storeId, year, last_number: 1
      })
    }

    // Step 3: Insert sale
    const saleId = uuid()
    let saleStatus: string
    const totalPaid = paymentsTotal

    if (isShortPay) {
      saleStatus = totalPaid === 0 ? "unpaid" : "partial"
    } else {
      saleStatus = "completed"
    }

    const { error: saleError } = await db.from("sales").insert({
      id: saleId,
      store_id: storeId,
      sale_number: saleNumber,
      employee_id: employeeId,
      customer_id: customerId || null,
      subtotal,
      discount_type: discountType || null,
      discount_value: discountValue || 0,
      discount_amount: discountAmount || 0,
      tax_total: taxTotal,
      total,
      amount_paid: totalPaid,
      balance: hasBalance,
      status: saleStatus,
    })

    if (saleError) {
      return NextResponse.json({ error: `Failed to create sale: ${saleError.message}` }, { status: 400 })
    }

    // Step 4: Insert sale items + deduct stock + log inventory
    for (const item of items) {
      const deductedQty = item.qty * item.baseQty
      const costAtSale = (item as any)._cost
      const taxRateId = (item as any)._taxRateId

      // Fetch tax rate
      let taxRate = 0
      if (taxRateId) {
        const { data: tr } = await db.from("tax_rates").select("rate").eq("id", taxRateId).single()
        if (tr) taxRate = Number(tr.rate)
      }

      // Per-item discount proportion
      const itemDiscount = discountAmount > 0
        ? discountAmount * ((item.unitPrice * item.qty) / (subtotal || 1))
        : 0

      const itemTax = (item.discountEligible && discountAmount > 0)
        ? ((item.unitPrice * item.qty) - itemDiscount) * taxRate
        : (item.unitPrice * item.qty) * taxRate

      const lineTotal = (item.unitPrice * item.qty) - itemDiscount + itemTax

      await db.from("sale_items").insert({
        id: uuid(),
        sale_id: saleId,
        item_id: item.itemId,
        item_name: item.itemName || "",
        selling_unit_id: item.unitId,
        selling_unit_name: item.unitName,
        base_qty_snapshot: item.baseQty,
        qty: item.qty,
        unit_price: item.unitPrice,
        cost_at_sale: costAtSale ? Number(costAtSale) : null,
        tax_rate: taxRate,
        tax_amount: itemTax,
        discount_amount: itemDiscount,
        line_total: lineTotal,
        deducted_qty: deductedQty,
        status: "completed",
      })

      // Deduct stock
      const { data: currentItem } = await db.from("items").select("stock_qty").eq("id", item.itemId).single()
      const oldQty = Number(currentItem?.stock_qty ?? 0)
      const newQty = oldQty - deductedQty

      await db.from("items").update({ stock_qty: newQty }).eq("id", item.itemId)

      // Inventory log
      await db.from("inventory_log").insert({
        id: uuid(),
        store_id: storeId,
        item_id: item.itemId,
        change_qty: -deductedQty,
        qty_before: oldQty,
        qty_after: newQty,
        reason: "sale",
        sale_id: saleId,
        employee_id: employeeId,
      })
    }

    // Step 5: Insert payments (skip if short-pay with 0 paid)
    for (const p of payments) {
      if (p.amount <= 0) continue
      await db.from("payments").insert({
        id: uuid(),
        sale_id: saleId,
        method: p.method,
        amount: p.amount,
        is_collection: false,
        receipt_no: `REC-${String(saleNumber).padStart(6, "0")}`,
        created_by: employeeId,
      })
    }

    // Step 6: Journal
    await db.from("journal").insert({
      id: uuid(),
      store_id: storeId,
      event_type: "sale_completed",
      sale_id: saleId,
      employee_id: employeeId,
      details: {
        sale_number: saleNumber,
        items: items.map(i => ({ name: i.itemName, qty: i.qty, unit: i.unitName })),
        payments: payments,
        total, balance: hasBalance, status: saleStatus,
      },
    })

    // Step 7: Clear cart
    await db.from("pos_carts").update({ cart_data: [] }).eq("shift_id", storeId)

    // Step 8: Return response
    return NextResponse.json({
      sale: {
        id: saleId,
        sale_number: saleNumber,
        total, amount_paid: totalPaid, balance: hasBalance,
        status: saleStatus,
        payments: payments,
        items: items,
      }
    }, { status: 201 })

  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
