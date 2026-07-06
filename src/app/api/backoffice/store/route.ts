import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()
    const { data: store } = await db.from("stores")
      .select("id, name, tin, address, contact, receipt_header, receipt_footer")
      .eq("id", session.storeId).single()
    return NextResponse.json({ store })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    const body = await request.json()
    const { name, tin, address, contact, receipt_header, receipt_footer } = body

    const upd: Record<string, any> = {}
    if (name !== undefined) upd.name = name
    if (tin !== undefined) upd.tin = tin
    if (address !== undefined) upd.address = address
    if (contact !== undefined) upd.contact = contact
    if (receipt_header !== undefined) upd.receipt_header = receipt_header
    if (receipt_footer !== undefined) upd.receipt_footer = receipt_footer

    const { data: store, error } = await db.from("stores")
      .update(upd).eq("id", session.storeId).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ store })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
