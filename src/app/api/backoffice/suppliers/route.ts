import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const search = request.nextUrl.searchParams.get("q") || ""
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true"

    let query = db.from("suppliers").select("*").eq("store_id", storeId)
    if (!includeInactive) query = query.eq("status", "active")
    if (search) query = query.or(`name.ilike.%${search}%,contact.ilike.%${search}%`)
    query = query.order("name", { ascending: true })

    const { data: suppliers } = await query
    return NextResponse.json({ suppliers: suppliers ?? [] })
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
    const { name, contact, address, note } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: created, error } = await db.from("suppliers").insert({
      id: uuid(), store_id: storeId, name: name.trim(),
      contact: contact || null, address: address || null, note: note || null,
      status: "active",
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ supplier: created }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
