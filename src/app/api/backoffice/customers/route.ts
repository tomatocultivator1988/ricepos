import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const search = request.nextUrl.searchParams.get("q") || ""

    const { data: customers } = await db
      .from("customers")
      .select(`
        id, name, contact, address, type, status,
        sales(id, balance, status)
      `)
      .eq("store_id", storeId)
      .eq("status", "active")
      .or(`name.ilike.%${search}%,contact.ilike.%${search}%`)
      .limit(search ? 20 : 100)

    // Compute balance per customer on-the-fly
    const formatted = (customers ?? []).map((c: any) => {
      const balance = (c.sales ?? [])
        .filter((s: any) => s.status === "unpaid" || s.status === "partial")
        .reduce((sum: number, s: any) => sum + Number(s.balance), 0)
      return { ...c, balance, sales: undefined }
    })

    return NextResponse.json({ customers: formatted })
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
    const { name, contact, address, type } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: created, error } = await db
      .from("customers")
      .insert({
        store_id: storeId,
        name: name.trim(),
        contact: contact || null,
        address: address || null,
        type: type || "retail",
        status: "active",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ customer: { ...created, balance: 0 } }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
