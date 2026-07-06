import "dotenv/config"
import { db } from "./client"
import { v4 as uuid } from "uuid"

async function seedSales() {
  const { data: store } = await db.from("stores").select("id").single()
  const { data: emp } = await db.from("employees").select("id").eq("role", "admin").single()
  const { data: items } = await db.from("items").select("id,name,cost,sell_by").eq("status", "active")
  if (!store || !emp || !items) { console.log("Missing data"); process.exit(1) }

  // Clear old sales
  await db.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("sale_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("inventory_log").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("sale_sequences").delete().neq("year", 0)

  const r = items.find((i: any) => i.name === "Sinandomeng")!
  const c = items.find((i: any) => i.name === "Mega Sardines")!
  const n = items.find((i: any) => i.name === "Lucky Me Pancit Canton")!
  const su = items.find((i: any) => i.name === "White Sugar")!

  let sn = 1
  const storeId = store.id
  const empId = emp.id

  for (let d = 13; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000)
    const ds = date.toISOString().split("T")[0]
    const count = d === 0 ? (6 + Math.floor(Math.random() * 5)) : d <= 2 ? (4 + Math.floor(Math.random() * 5)) : (2 + Math.floor(Math.random() * 4))

    for (let s = 0; s < count; s++) {
      const sid = uuid()
      const lines: any[] = []
      let sub = 0

      const rq = 2 + Math.floor(Math.random() * 4)
      lines.push({ id: r.id, name: r.name, qty: rq, px: 55, cost: r.cost, taxR: 0 })
      sub += rq * 55

      if (Math.random() > 0.3) { const q = 1 + Math.floor(Math.random() * 4); lines.push({ id: c.id, name: c.name, qty: q, px: 25, cost: c.cost, taxR: 0.12 }); sub += q * 25 }
      if (Math.random() > 0.4) { const q = 1 + Math.floor(Math.random() * 3); lines.push({ id: n.id, name: n.name, qty: q, px: 16, cost: n.cost, taxR: 0.12 }); sub += q * 16 }
      if (Math.random() > 0.6) { const q = 1 + Math.floor(Math.random() * 2); lines.push({ id: su.id, name: su.name, qty: q, px: 75, cost: su.cost, taxR: 0 }); sub += q * 75 }

      const tax = lines.reduce((s, l) => s + (l.qty * l.px * l.taxR), 0)
      const total = sub + tax
      const h = String(7 + Math.floor(Math.random() * 14)).padStart(2, "0")
      const m = String(Math.floor(Math.random() * 60)).padStart(2, "0")
      const ts = new Date(`${ds}T${h}:${m}:00+08:00`).toISOString()

      await db.from("sales").insert({
        id: sid, store_id: storeId, sale_number: sn, employee_id: empId,
        subtotal: sub, discount_amount: 0, tax_total: tax, total,
        amount_paid: total, balance: 0, status: "completed", created_at: ts,
      })
      sn++

      for (const l of lines) {
        const litotal = l.qty * l.px + (l.qty * l.px * l.taxR)
        await db.from("sale_items").insert({
          id: uuid(), sale_id: sid, item_id: l.id, item_name: l.name,
          selling_unit_name: l.taxR === 0 && (l.id === r.id || l.id === su.id) ? "Per Kilo" : "Piece",
          base_qty_snapshot: 1, qty: l.qty, unit_price: l.px,
          cost_at_sale: l.cost, tax_rate: l.taxR,
          tax_amount: l.qty * l.px * l.taxR, line_total: litotal,
          deducted_qty: l.qty, status: "completed", created_at: ts,
        })
        // Deduct stock
        const { data: cur } = await db.from("items").select("stock_qty").eq("id", l.id).single()
        if (cur) {
          await db.from("items").update({ stock_qty: Number(cur.stock_qty) - l.qty }).eq("id", l.id)
        }
      }

      const mtd = Math.random() > 0.5 ? "cash" : "gcash"
      await db.from("payments").insert({
        id: uuid(), sale_id: sid, method: mtd, amount: total,
        receipt_no: `REC-${String(sn).padStart(6, "0")}`, created_by: empId, created_at: ts,
      })
    }
  }

  // Update sequence
  const y = new Date().getFullYear()
  await db.from("sale_sequences").upsert({ store_id: storeId, year: y, last_number: sn - 1 }, { onConflict: "store_id,year" })

  const { count } = await db.from("sales").select("count", { count: "exact", head: true })
  console.log(`Seeded ${count} sales over 14 days (today through 13 days ago).`)
  process.exit(0)
}

seedSales().catch(e => { console.error(e); process.exit(1) })
