import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, unauth } from "@/lib/auth/session"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const storeId = session.storeId
    const { id: customerId } = await params

    const { data: customer } = await db.from("customers")
      .select("id, name, contact, address, type")
      .eq("id", customerId).eq("store_id", storeId).single()

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

    const { data: store } = await db.from("stores")
      .select("name, tin, address, contact").eq("id", storeId).single()

    // Get all sales for this customer (not voided/refunded)
    const { data: sales } = await db.from("sales")
      .select("id, sale_number, total, amount_paid, balance, status, created_at")
      .eq("customer_id", customerId)
      .not("status", "in", '("voided","refunded")')
      .order("created_at", { ascending: true })

    // Get all payments/collections
    const saleIds = (sales ?? []).map((s: any) => s.id)
    let allPayments: any[] = []
    if (saleIds.length > 0) {
      const { data: payments } = await db.from("payments")
        .select("id, sale_id, method, amount, is_collection, created_at")
        .in("sale_id", saleIds)
        .order("created_at", { ascending: true })
      allPayments = payments ?? []
    }

    // Build transaction list (debits = sales, credits = payments)
    const transactions: any[] = []

    for (const sale of sales ?? []) {
      transactions.push({
        date: new Date(sale.created_at).toLocaleDateString("en-PH"),
        ref: `#${String(sale.sale_number).padStart(6, "0")}`,
        description: "Purchase",
        debit: Number(sale.total),
        credit: 0,
        type: "sale",
      })
    }

    const paymentMap = new Map<string, any[]>()
    for (const p of allPayments) {
      if (!paymentMap.has(p.sale_id)) paymentMap.set(p.sale_id, [])
      paymentMap.get(p.sale_id)!.push(p)
    }

    for (const [saleId, payments] of paymentMap) {
      for (const p of payments) {
        transactions.push({
          date: new Date(p.created_at).toLocaleDateString("en-PH"),
          ref: p.is_collection ? `Collection` : "Payment",
          description: `${p.method.toUpperCase()} payment`,
          debit: 0,
          credit: Number(p.amount),
          type: "payment",
        })
      }
    }

    // Sort by date
    transactions.sort((a, b) => a.date.localeCompare(b.date))

    // Compute running balance
    let running = 0
    for (const t of transactions) {
      running = running + Number(t.debit) - Number(t.credit)
      t.balance = running
    }

    // Build HTML for the SOA (simple HTML table since we don't have @react-pdf setup)
    const storeName = store?.name || "GroceryPOS"
    const rows = transactions.map(t => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;">${t.date}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;">${t.ref}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;">${t.description}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;">${t.debit > 0 ? t.debit.toFixed(2) : ""}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;">${t.credit > 0 ? t.credit.toFixed(2) : ""}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;font-weight:600;">${t.balance.toFixed(2)}</td>
      </tr>
    `).join("")

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Statement of Account</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 30px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header h1 { font-size: 18px; margin: 0 0 4px 0; }
  .header p { margin: 2px 0; font-size: 11px; color: #555; }
  .cust{ margin-bottom: 16px; border:1px solid #ddd; padding:10px; border-radius:4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { font-size: 11px; }
  .footer { margin-top: 24px; text-align: right; font-size: 14px; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <h1>${storeName}</h1>
    <p>${store?.address || ""} | ${store?.tin ? `TIN: ${store.tin}` : ""}</p>
    <h2 style="margin-top:16px;font-size:16px;">STATEMENT OF ACCOUNT</h2>
  </div>
  <div class="cust">
    <strong>Customer:</strong> ${customer.name}<br/>
    <strong>Type:</strong> ${customer.type}<br/>
    ${customer.contact ? `<strong>Contact:</strong> ${customer.contact}<br/>` : ""}
    ${customer.address ? `<strong>Address:</strong> ${customer.address}` : ""}
  </div>
  <table>
    <thead><tr>
      <th>Date</th><th>Ref</th><th>Description</th>
      <th style="text-align:right;">Debit</th><th style="text-align:right;">Credit</th>
      <th style="text-align:right;">Balance</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    Closing Balance: ₱${running.toFixed(2)}
  </div>
</body></html>`

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
