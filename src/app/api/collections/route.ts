import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

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

    // Execute collection atomically via PG function (FOR UPDATE lock)
    const { data, error } = await db.rpc("process_collection", {
      p_customer_id: customerId,
      p_amount: Number(amount),
      p_method: method,
      p_store_id: storeId,
      p_employee_id: employeeId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = data as Record<string, any>
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Collection failed" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      totalAllocated: result.totalAllocated,
      remaining: result.remaining,
      newBalance: result.newBalance,
      allocations: result.allocations,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
