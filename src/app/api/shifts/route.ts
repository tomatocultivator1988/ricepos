import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

// Compute cash collected during a shift window (cash only)
async function computeCashDuringShift(storeId: string, openedAt: string) {
  // All cash payments (sales + collections) since shift opened
  const { data: payments } = await db.from("payments")
    .select("amount, is_collection, sale_id")
    .eq("method", "cash")
    .gte("created_at", openedAt)

  let cashSales = 0
  let cashCollections = 0
  for (const p of (payments ?? [])) {
    if (p.is_collection) cashCollections += Number(p.amount)
    else cashSales += Number(p.amount)
  }
  return { cashSales, cashCollections }
}

// GET — current open shift (with live expected cash) or null
export async function GET() {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const { data: shift } = await db.from("shifts")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!shift) return NextResponse.json({ shift: null })

    const { cashSales, cashCollections } = await computeCashDuringShift(storeId, shift.opened_at)
    const expectedCash = Number(shift.opening_cash) + cashSales + cashCollections

    return NextResponse.json({
      shift: {
        ...shift,
        cash_sales: cashSales,
        cash_collections: cashCollections,
        expected_cash: expectedCash,
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — open a new shift
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { opening_cash, opening_denoms } = body

    // Edge case: only one open shift at a time
    const { data: existing } = await db.from("shifts")
      .select("id").eq("store_id", storeId).eq("status", "open").maybeSingle()
    if (existing) {
      return NextResponse.json({ error: "A shift is already open. Close it first." }, { status: 400 })
    }

    if (opening_cash === undefined || Number(opening_cash) < 0) {
      return NextResponse.json({ error: "Opening cash required" }, { status: 400 })
    }

    const { data: created, error } = await db.from("shifts").insert({
      id: uuid(),
      store_id: storeId,
      employee_id: session.employeeId,
      status: "open",
      opened_at: new Date().toISOString(),
      opening_cash: Number(opening_cash),
      opening_denoms: opening_denoms || {},
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Journal
    await db.from("journal").insert({
      id: uuid(), store_id: storeId, event_type: "shift_opened",
      employee_id: session.employeeId,
      details: { opening_cash: Number(opening_cash), denoms: opening_denoms },
    })

    return NextResponse.json({ shift: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT — close the current open shift
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const body = await request.json()
    const { closing_cash, closing_denoms, note } = body

    const { data: shift } = await db.from("shifts")
      .select("*").eq("store_id", storeId).eq("status", "open")
      .order("opened_at", { ascending: false }).limit(1).maybeSingle()

    if (!shift) return NextResponse.json({ error: "No open shift to close" }, { status: 400 })
    if (closing_cash === undefined || Number(closing_cash) < 0) {
      return NextResponse.json({ error: "Closing cash count required" }, { status: 400 })
    }

    const { cashSales, cashCollections } = await computeCashDuringShift(storeId, shift.opened_at)
    const expectedCash = Number(shift.opening_cash) + cashSales + cashCollections
    const variance = Number(closing_cash) - expectedCash

    const { data: updated, error } = await db.from("shifts").update({
      status: "closed",
      closed_at: new Date().toISOString(),
      closing_cash: Number(closing_cash),
      closing_denoms: closing_denoms || {},
      cash_sales: cashSales,
      cash_collections: cashCollections,
      expected_cash: expectedCash,
      variance,
      note: note || null,
    }).eq("id", shift.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Also record a cash_count row for the dashboard variance widget
    await db.from("cash_counts").insert({
      id: uuid(), store_id: storeId, date: new Date().toISOString().split("T")[0],
      system_total: expectedCash, counted_amount: Number(closing_cash), variance,
      notes: note || "Shift close", employee_id: session.employeeId,
    })

    await db.from("journal").insert({
      id: uuid(), store_id: storeId, event_type: "shift_closed",
      employee_id: session.employeeId,
      details: { expected: expectedCash, counted: Number(closing_cash), variance, denoms: closing_denoms },
    })

    return NextResponse.json({ shift: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
