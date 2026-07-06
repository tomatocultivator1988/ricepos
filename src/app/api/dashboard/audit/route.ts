import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100")

    const { data: logs } = await db.from("audit_log")
      .select("*").eq("store_id", storeId)
      .order("created_at", { ascending: false }).limit(limit)

    // Attach employee names
    const empIds = [...new Set((logs ?? []).map((l: any) => l.employee_id).filter(Boolean))]
    const empMap = new Map<string, string>()
    if (empIds.length) {
      const { data: emps } = await db.from("employees").select("id, name").in("id", empIds as string[])
      ;(emps ?? []).forEach((e: any) => empMap.set(e.id, e.name))
    }

    return NextResponse.json({
      logs: (logs ?? []).map((l: any) => ({ ...l, employeeName: empMap.get(l.employee_id) ?? "System" }))
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
