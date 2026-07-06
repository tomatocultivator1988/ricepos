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

    // Get customer
    const { data: customer } = await db.from("customers")
      .select("*").eq("id", id).eq("store_id", storeId).single()
    if (!customer) return notfind("Customer not found")

    // Get unpaid/partial sales for this customer
    const { data: openSales } = await db.from("sales")
      .select("id, sale_number, total, amount_paid, balance, status, created_at")
      .eq("customer_id", id)
      .in("status", ["unpaid", "partial"])
      .order("created_at", { ascending: false })

    // Get all payments (collections) for this customer's sales
    const saleIds = (openSales ?? []).map((s: any) => s.id)
    let collections: any[] = []
    if (saleIds.length > 0) {
      const { data: pays } = await db.from("payments")
        .select("id, sale_id, method, amount, is_collection, receipt_no, created_at, created_by")
        .in("sale_id", saleIds)
        .order("created_at", { ascending: false })
      collections = pays ?? []
    }

    // Get employee names for collections
    const employeeIds = [...new Set(collections.map((c: any) => c.created_by).filter(Boolean))]
    const employeeMap = new Map<string, string>()
    if (employeeIds.length > 0) {
      const { data: emps } = await db.from("employees")
        .select("id, name").in("id", employeeIds as string[])
      ;(emps ?? []).forEach((e: any) => employeeMap.set(e.id, e.name))
    }

    // Compute balance live
    const balance = (openSales ?? []).reduce((sum: number, s: any) => sum + Number(s.balance), 0)

    return NextResponse.json({
      customer,
      balance,
      openSales: (openSales ?? []).map((s: any) => ({
        ...s,
        daysSince: Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000),
      })),
      collections: collections.map((c: any) => ({
        ...c,
        employeeName: employeeMap.get(c.created_by) ?? "Unknown",
      })),
    })
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
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db.from("customers")
      .select("id, status").eq("id", id).eq("store_id", storeId).single()
    if (!existing) return notfind("Customer not found")

    const body = await request.json()
    const { name, contact, address, type, status } = body

    // Block deactivation if has balance
    if (status === "inactive") {
      const { data: openSales } = await db.from("sales")
        .select("balance").eq("customer_id", id).in("status", ["unpaid", "partial"])
      const balance = (openSales ?? []).reduce((s: number, r: any) => s + Number(r.balance), 0)
      if (balance > 0) {
        return NextResponse.json(
          { error: `Cannot deactivate customer with outstanding balance (₱${balance.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    const upd: Record<string, any> = {}
    if (name !== undefined) upd.name = name.trim()
    if (contact !== undefined) upd.contact = contact
    if (address !== undefined) upd.address = address
    if (type !== undefined) upd.type = type
    if (status !== undefined) upd.status = status

    const { data: updated } = await db.from("customers")
      .update(upd).eq("id", id).select().single()

    return NextResponse.json({ customer: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
