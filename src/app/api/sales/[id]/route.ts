import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, forbid } from "@/lib/auth/session"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const { id: saleId } = await params
    const body = await request.json()
    const { action, reason } = body

    if (!action || !["void", "refund"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'void' or 'refund'" }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 })
    }

    if (session.role !== "admin") return forbid("Only admin can perform this action")

    const { data, error } = await db.rpc("process_void_or_refund", {
      p_store_id: session.storeId,
      p_employee_id: session.employeeId,
      p_sale_id: saleId,
      p_action: action,
      p_reason: reason,
    })

    if (error) {
      return NextResponse.json({ error: `Void/refund failed: ${error.message}` }, { status: 500 })
    }

    const result = data as any
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Void/refund failed" }, { status: 400 })
    }

    return NextResponse.json({ success: true, sale: { id: result.sale.id, status: result.sale.status } })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
