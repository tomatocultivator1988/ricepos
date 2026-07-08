import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const storeId = session.storeId

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
    const offset = (page - 1) * limit
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const employeeId = searchParams.get("employeeId")
    const search = searchParams.get("search")

    let saleIdsFromSearch: string[] | null = null
    if (search && search.trim().length > 0) {
      const { data: matchingItems } = await db
        .from("sale_items")
        .select("sale_id")
        .ilike("item_name", `%${search.trim()}%`)
        .limit(500)
      if (matchingItems && matchingItems.length > 0) {
        saleIdsFromSearch = (matchingItems as Record<string, any>[]).map((i: Record<string, any>) => i.sale_id)
      }
    }

    let salesQuery = db
      .from("sales")
      .select("id, sale_number, total, status, created_at, employee_id", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) salesQuery = salesQuery.gte("created_at", from + "T00:00:00")
    if (to) salesQuery = salesQuery.lte("created_at", to + "T23:59:59.999")
    if (employeeId) salesQuery = salesQuery.eq("employee_id", employeeId)

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`
      const orFilters: string[] = [`sale_number.ilike.${term}`]
      if (saleIdsFromSearch && saleIdsFromSearch.length > 0 && saleIdsFromSearch.length <= 100) {
        orFilters.push(...saleIdsFromSearch.map(id => `id.eq.${id}`))
      }
      if (orFilters.length > 1) {
        salesQuery = (salesQuery as any).or(orFilters.join(","))
      } else {
        salesQuery = (salesQuery as any).or(orFilters[0])
      }
    }

    const { data: rows, count } = await salesQuery

    const saleIds = (rows ?? []).map((s: Record<string, any>) => s.id)
    const employeeIds = [...new Set((rows ?? []).map((s: Record<string, any>) => s.employee_id).filter(Boolean))]
    
    let employeeMap = new Map<string, string>()
    if (employeeIds.length > 0) {
      const { data: empRows } = await db.from("employees").select("id, name").in("id", employeeIds)
      for (const e of (empRows ?? [])) { employeeMap.set(e.id, e.name) }
    }

    let paymentMap = new Map<string, string>()

    if (saleIds.length > 0) {
      const { data: paymentRows } = await db
        .from("payments")
        .select("sale_id, method")
        .in("sale_id", saleIds)

      for (const p of paymentRows as Record<string, any>[] ?? []) {
        if (paymentMap.has(p.sale_id)) {
          paymentMap.set(p.sale_id, "split")
        } else {
          paymentMap.set(p.sale_id, p.method)
        }
      }
    }

    const result = (rows ?? []).map((s: Record<string, any>) => ({
      id: s.id,
      saleNumber: s.sale_number ?? null,
      employeeName: employeeMap.get(s.employee_id) ?? "N/A",
      paymentMethod: paymentMap.get(s.id) ?? "unknown",
      total: Number(Number(s.total).toFixed(2)),
      status: s.status,
      createdAt: s.created_at?.toString() ?? null,
    }))

    return NextResponse.json({
      sales: result,
      total: count ?? 0,
      page,
      pages: Math.ceil((count ?? 0) / limit),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    if (error.message === "Store not found") return NextResponse.json({ error: "Store not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
