import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, notfind } from "@/lib/auth/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id } = await params

    const { data: existing } = await db.from("suppliers")
      .select("id").eq("id", id).eq("store_id", storeId).single()
    if (!existing) return notfind("Supplier not found")

    const body = await request.json()
    const { name, contact, address, note, status } = body

    // Block deactivation if supplier has open POs
    if (status === "inactive") {
      const { data: openPOs } = await db.from("purchase_orders")
        .select("id").eq("supplier_id", id).in("status", ["ordered", "partial"])
      if (openPOs && openPOs.length > 0) {
        return NextResponse.json(
          { error: `Cannot deactivate — supplier has ${openPOs.length} open purchase order(s)` },
          { status: 400 }
        )
      }
    }

    const upd: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) upd.name = name.trim()
    if (contact !== undefined) upd.contact = contact
    if (address !== undefined) upd.address = address
    if (note !== undefined) upd.note = note
    if (status !== undefined) upd.status = status

    const { data: updated } = await db.from("suppliers")
      .update(upd).eq("id", id).select().single()

    return NextResponse.json({ supplier: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
