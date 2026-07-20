import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth, forbid } from "@/lib/auth/session"
import { v4 as uuid } from "uuid"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const storeId = session.storeId

    const tables = ["items", "selling_units", "customers", "sales", "sale_items", "payments", "expenses", "inventory_log", "cash_counts", "categories", "tax_rates", "discounts", "employees", "audit_log", "journal", "stores", "settings", "pos_carts", "time_logs", "sale_sequences"]
    const data: Record<string, any[]> = {}

    for (const table of tables) {
      try {
        const { data: rows } = await db.from(table).select("*").eq("store_id", storeId)
        const sanitized = (rows ?? []).map(row => {
          const r = { ...row }
          if (table === "employees" && r.pin_hash) delete r.pin_hash
          return r
        })
        data[table] = sanitized
      } catch {
        try {
          const { data: rows } = await db.from(table).select("*")
          const sanitized = (rows ?? []).map(row => {
            const r = { ...row }
            if (table === "employees" && r.pin_hash) delete r.pin_hash
            return r
          })
          data[table] = sanitized
        } catch { data[table] = [] }
      }
    }

    const backup = {
      version: "1.1",
      exportedAt: new Date().toISOString(),
      storeId,
      data,
    }

    return NextResponse.json(backup, {
      headers: {
        "Content-Disposition": `attachment; filename="ricepos-backup-${new Date().toISOString().slice(0, 10)}.json"`,
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

    // Validate backup format
    if (!backup.data || !backup.storeId) {
      return NextResponse.json({ error: "Invalid backup file — missing data or storeId" }, { status: 400 })
    }
    if (backup.storeId !== storeId) {
      return NextResponse.json({ error: "Backup belongs to a different store" }, { status: 400 })
    }

    // Save pre-restore snapshot as safety net
    const preRestoreBackup: Record<string, any[]> = {}
    const tables = ["items", "selling_units", "customers", "sales", "sale_items", "payments", "expenses", "inventory_log", "cash_counts", "categories", "tax_rates", "discounts", "employees", "audit_log", "journal", "stores", "settings", "pos_carts", "time_logs", "sale_sequences"]
    for (const table of tables) {
      try {
        const { data: rows } = await db.from(table).select("*").eq("store_id", storeId)
        preRestoreBackup[table] = rows ?? []
      } catch { preRestoreBackup[table] = [] }
    }

    // Store pre-restore backup
    const preRestoreId = uuid()
    const preRestoreKey = `pre_restore_backup_${Date.now()}`
    await db.from("settings").insert({
      id: preRestoreId,
      store_id: storeId,
      key: preRestoreKey,
      value: { exportedAt: new Date().toISOString(), data: preRestoreBackup },
    }).select("id").single()

    // Restore: delete then insert per table
    let imported = 0
    const failed: string[] = []

    for (const table of tables) {
      const rows = backup.data[table]
      if (!rows || rows.length === 0) continue
      try {
        const { error: delErr } = await db.from(table).delete().eq("store_id", storeId)
        if (delErr) { failed.push(`${table} (delete)`); continue }

        const sanitized = rows.map((row: any) => {
          const r = { ...row }
          delete r.id // Force new UUIDs on insert
          if (table === "employees" && !r.pin_hash) r.pin_hash = "" // ensure pin_hash present
          return r
        })

        const { error: insErr } = await db.from(table).insert(sanitized)
        if (insErr) { failed.push(`${table} (insert)`); continue }

        imported += rows.length
      } catch { failed.push(table) }
    }

    // Audit log the restore
    await db.from("audit_log").insert({
      id: uuid(),
      store_id: storeId,
      employee_id: session.employeeId,
      action: "backup_restored",
      entity_type: "backup",
      new_value: { imported, failed_tables: failed, pre_restore_key: preRestoreKey },
    })

    return NextResponse.json({
      success: true,
      imported,
      failed,
      preRestoreSaved: failed.length > 0,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
