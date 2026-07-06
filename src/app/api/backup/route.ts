import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, forbid } from "@/lib/auth/session"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const storeId = session.storeId

    const tables = ["items", "categories", "employees", "customers", "discounts", "tax_rates", "sales", "sale_items", "payments", "journal", "inventory_log", "product_variants", "product_ingredients", "time_logs"]
    const data: Record<string, any[]> = {}

    for (const table of tables) {
      try {
        const { data: rows } = await db.from(table).select("*").eq("store_id", storeId)
        data[table] = rows ?? []
      } catch {
        try {
          const { data: rows } = await db.from(table).select("*")
          data[table] = rows ?? []
        } catch { data[table] = [] }
      }
    }

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      storeId,
      data,
    }

    return NextResponse.json(backup, {
      headers: {
        "Content-Disposition": `attachment; filename="brewhas-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const storeId = session.storeId

    const backup = await request.json()
    if (!backup.data || !backup.storeId) {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 })
    }

    const tables = ["items", "categories", "employees", "customers", "discounts", "tax_rates", "sales", "sale_items", "payments", "journal", "inventory_log", "product_variants", "product_ingredients", "time_logs"]
    let imported = 0

    for (const table of tables) {
      const rows = backup.data[table]
      if (!rows || rows.length === 0) continue
      try {
        await db.from(table).delete().eq("store_id", storeId)
        await db.from(table).insert(rows)
        imported += rows.length
      } catch { }
    }

    return NextResponse.json({ success: true, imported })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
