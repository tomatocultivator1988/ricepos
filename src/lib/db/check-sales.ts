import "dotenv/config"
import { db } from "./client"

async function check() {
  const { count } = await db.from("sales").select("*", { count: "exact", head: true })
  console.log("Total sales:", count)

  // Check dashboard data
  const today = new Date().toISOString().split("T")[0]
  const { data: todaySales } = await db.from("sales")
    .select("total, status")
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`)
    .not("status", "in", '("voided","refunded")')
  
  const todayTotal = (todaySales ?? []).reduce((s: number, r: any) => {
    if (r.status === "voided" || r.status === "refunded") return s
    return s + Number(r.total)
  }, 0)
  console.log("Today's sales total:", todayTotal, "from", todaySales?.length, "transactions")

  // Check sales trend
  const { data: trend } = await db.from("sales")
    .select("total, created_at")
    .not("status", "in", '("voided","refunded")')
    .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    .order("created_at", { ascending: true })
  
  console.log("Sales trend entries:", trend?.length)
  if (trend && trend.length > 0) {
    const first = trend[0] as any
    const last = trend[trend.length - 1] as any
    console.log("  First:", new Date(first.created_at).toLocaleDateString(), "P" + first.total)
    console.log("  Last:", new Date(last.created_at).toLocaleDateString(), "P" + last.total)
  }
  
  process.exit(0)
}

check().catch(e => { console.error(e); process.exit(1) })
