import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const employeeId = session.employeeId
    const body = await request.json()
    const { customerId, amount, method } = body

    if (!customerId) return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    if (!method || !["cash", "gcash"].includes(method)) return NextResponse.json({ error: "Valid payment method required" }, { status: 400 })

    const payAmount = Number(amount)

    // Get open (unpaid/partial) sales for this customer, oldest first (FIFO)
    const { data: openSales } = await db.from("sales")
      .select("id, sale_number, total, amount_paid, balance, status")
      .eq("customer_id", customerId)
      .in("status", ["unpaid", "partial"])
      .order("created_at", { ascending: true })

    if (!openSales || openSales.length === 0) {
      return NextResponse.json({ error: "Customer has no outstanding balance" }, { status: 400 })
    }

    const totalOustanding = openSales.reduce((s: number, r: any) => s + Number(r.balance), 0)
    if (payAmount > totalOustanding) {
      return NextResponse.json(
        { error: `Payment (₱${payAmount.toFixed(2)}) exceeds outstanding balance (₱${totalOustanding.toFixed(2)})` },
        { status: 400 }
      )
    }

    let remaining = payAmount
    const allocations: { saleId: string; allocated: number; newStatus: string }[] = []

    // FIFO allocation
    for (const sale of openSales) {
      if (remaining <= 0) break
      const balance = Number(sale.balance)
      if (balance <= 0) continue

      const alloc = Math.min(remaining, balance)
      remaining -= alloc

      const newAmountPaid = Number(sale.amount_paid) + alloc
      const newBalance = Number(sale.total) - newAmountPaid
      const newStatus = newBalance <= 0.01 ? "paid" : "partial"

      await db.from("sales").update({
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      }).eq("id", sale.id)

      // Generate collection receipt number
      const year = new Date().getFullYear()
      const { data: seq } = await db.from("sale_sequences")
        .select("last_number").eq("store_id", storeId).eq("year", year).single()

      let colNum = 1
      if (seq) {
        colNum = seq.last_number + 1
        await db.from("sale_sequences").update({ last_number: colNum }).eq("store_id", storeId).eq("year", year)
      } else {
        await db.from("sale_sequences").insert({ store_id: storeId, year, last_number: 1 })
      }

      const receiptNo = `COL-${String(colNum).padStart(6, "0")}`

      await db.from("payments").insert({
        id: uuid(),
        sale_id: sale.id,
        method,
        amount: alloc,
        is_collection: true,
        receipt_no: receiptNo,
        created_by: employeeId,
      })

      // Journal entry
      await db.from("journal").insert({
        id: uuid(),
        store_id: storeId,
        event_type: "collection_recorded",
        sale_id: sale.id,
        employee_id: employeeId,
        details: { amount: alloc, method, receipt_no: receiptNo },
      })

      allocations.push({ saleId: sale.id, allocated: alloc, newStatus })
    }

    // Compute new total balance
    const { data: updatedSales } = await db.from("sales")
      .select("balance").eq("customer_id", customerId).in("status", ["unpaid", "partial"])
    const newBalance = (updatedSales ?? []).reduce((s: number, r: any) => s + Number(r.balance), 0)

    return NextResponse.json({
      success: true,
      totalAllocated: payAmount,
      remaining,
      newBalance,
      allocations,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
