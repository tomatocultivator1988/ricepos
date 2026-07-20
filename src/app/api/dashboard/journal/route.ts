import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const raw = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)
    const limit = Math.min(100, Math.max(1, isNaN(raw) ? 50 : raw))

    const { data: entries } = await db.from("journal")
      .select("*").eq("store_id", storeId)
      .order("created_at", { ascending: false }).limit(limit)

    return NextResponse.json({ entries: entries ?? [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
