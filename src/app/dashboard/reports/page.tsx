"use client"

import { useState, useEffect } from "react"
import { Loader2Icon, DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface ReportRow { [key: string]: any }

export default function ReportsPage() {
  const [period, setPeriod] = useState("daily")
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0])
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("sales")

  useEffect(() => {
    const now = new Date()
    if (period === "daily") { setFrom(now.toISOString().split("T")[0]); setTo(now.toISOString().split("T")[0]) }
    else if (period === "monthly") { setFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setTo(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,"0")}`) }
    else if (period === "yearly") { setFrom(`${now.getFullYear()}-01-01`); setTo(`${now.getFullYear()}-12-31`) }
  }, [period])

  useEffect(() => {
    if (!from || !to) return
    setLoading(true)
    fetch(`/api/reports?type=${activeTab}&from=${from}&to=${to}`).then(r => r.json()).then(d => {
      setData(d); setLoading(false)
    })
  }, [from, to, activeTab])

  function fmoney(v: any) { return `₱${Number(v ?? 0).toFixed(2)}` }
  function fnum(v: any, dec?: number) { return Number(v ?? 0).toFixed(dec ?? 0) }
  function fdate(v: any) { try { return new Date(v).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) } catch { return String(v ?? "") } }

  function exportCSV(rows: any[], headers: string[]) {
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${activeTab}_${from}_${to}.csv`; a.click()
  }

  function renderTable(rows: ReportRow[], columns: { key: string; label: string; format: "money" | "number" | "date" | "text" | "percent" }[]) {
    return (
      <>
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(rows, columns.map(c => c.key))} className="text-xs gap-1"><DownloadIcon className="h-3 w-3" /> CSV</Button>
        </div>
        <Card className="bg-gold-200/90 border-amber-300/60 overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-amber-300/60">{columns.map(c => <th key={c.key} className="text-left px-3 py-2 text-stone-500 font-medium">{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={columns.length} className="text-center text-stone-500 py-8">No data</td></tr> :
                  rows.map((r, i) => <tr key={i} className="border-b border-amber-300/60 hover:bg-gold-200/50">
                    {columns.map(c => {
                      const v = r[c.key]
                      let display = ""
                      if (c.format === "money") display = fmoney(v)
                      else if (c.format === "number") display = fnum(v)
                      else if (c.format === "date") display = fdate(v)
                      else if (c.format === "percent") display = fnum(v, 1) + "%"
                      else display = String(v ?? "—")
                      return <td key={c.key} className={`px-3 py-1.5 text-stone-700 ${c.format !== "text" ? "text-right tabular-nums" : ""}`}>{display}</td>
                    })}
                  </tr>)}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </>
    )
  }

  const tabs = [
    { key: "sales", label: "Sales" },
    { key: "profit", label: "Profit" },
    { key: "products", label: "By Product" },
    { key: "receivables", label: "Receivables" },
    { key: "inventory", label: "Inventory" },
    { key: "voids", label: "Voids" },
    { key: "zreading", label: "Z-Reading" },
    { key: "salesdetail", label: "Sales Detail" },
  ]

  function renderContent() {
    if (loading) return <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-amber-600" /></div>
    if (!data) return null

    if (activeTab === "sales" && data.rows) {
      return renderTable(data.rows, [
        { key: "date", label: "Date", format: "date" },
        { key: "count", label: "# Sales", format: "number" },
        { key: "cash", label: "Cash", format: "money" },
        { key: "gcash", label: "GCash", format: "money" },
        { key: "total", label: "Total", format: "money" },
      ])
    }
    if (activeTab === "profit" && data.rows) {
      return renderTable(data.rows, [
        { key: "date", label: "Date", format: "date" },
        { key: "revenue", label: "Revenue", format: "money" },
        { key: "cogs", label: "Cost", format: "money" },
        { key: "expenses", label: "Expenses", format: "money" },
        { key: "profit", label: "Profit", format: "money" },
        { key: "margin", label: "Margin", format: "percent" },
      ])
    }
    if (activeTab === "products" && data.rows) {
      return renderTable(data.rows, [
        { key: "name", label: "Product", format: "text" },
        { key: "qty", label: "Qty Sold", format: "number" },
        { key: "revenue", label: "Revenue", format: "money" },
        { key: "profit", label: "Profit", format: "money" },
      ])
    }
    if (activeTab === "receivables" && data.rows) {
      return renderTable(data.rows, [
        { key: "name", label: "Customer", format: "text" },
        { key: "total", label: "Total", format: "money" },
        { key: "d7", label: "0-7 days", format: "money" },
        { key: "d30", label: "8-30 days", format: "money" },
        { key: "d60", label: "31-60 days", format: "money" },
        { key: "d60plus", label: "60+ days", format: "money" },
      ])
    }
    if (activeTab === "inventory" && data.rows) {
      return renderTable(data.rows, [
        { key: "name", label: "Product", format: "text" },
        { key: "onHand", label: "On Hand", format: "number" },
        { key: "value", label: "Value", format: "money" },
        { key: "status", label: "Status", format: "text" },
      ])
    }
    if (activeTab === "voids" && data.rows) {
      return renderTable(data.rows, [
        { key: "date", label: "Date", format: "date" },
        { key: "saleNumber", label: "Receipt #", format: "number" },
        { key: "total", label: "Amount", format: "money" },
        { key: "type", label: "Type", format: "text" },
        { key: "reason", label: "Reason", format: "text" },
      ])
    }
    if (activeTab === "salesdetail" && data.rows) {
      return renderTable(data.rows, [
        { key: "time", label: "Time", format: "date" },
        { key: "sale_number", label: "Sale #", format: "text" },
        { key: "cashier", label: "Cashier", format: "text" },
        { key: "item_name", label: "Item", format: "text" },
        { key: "qty", label: "Qty", format: "number" },
        { key: "unit", label: "Unit", format: "text" },
        { key: "unit_price", label: "Unit Price", format: "money" },
        { key: "discount_amount", label: "Discount", format: "money" },
        { key: "tax_amount", label: "Tax", format: "money" },
        { key: "line_total", label: "Line Total", format: "money" },
        { key: "payment_amount", label: "Payment", format: "money" },
      ])
    }
    if (activeTab === "zreading" && data) {
      return (
        <Card className="bg-gold-200/90 border-amber-300/60 max-w-lg mx-auto text-stone-800 text-sm">
          <CardContent className="p-6 space-y-3">
            <div className="text-center">
              <h2 className="font-bold text-lg">Z-READING</h2>
              <p className="text-xs text-stone-500">{from} to {to}</p>
            </div>
            <div className="space-y-1 border-y border-amber-300/60 py-2">
              <div className="flex justify-between"><span>Gross Sales</span><span>{fmoney(data.gross)}</span></div>
              <div className="flex justify-between"><span className="text-red-600">Discounts</span><span className="text-red-600">-{fmoney(data.discounts)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{fmoney(data.tax)}</span></div>
              <div className="flex justify-between font-bold text-amber-600"><span>NET SALES</span><span>{fmoney(data.net)}</span></div>
            </div>
            <div className="flex justify-between"><span>Cash</span><span>{fmoney(data.cash)}</span></div>
            <div className="flex justify-between"><span>GCash</span><span>{fmoney(data.gcash)}</span></div>
            <div className="flex justify-between"><span>Sales Count</span><span>{data.saleCount}</span></div>
            <div className="flex justify-between"><span className="text-red-600">Voids</span><span>{data.voids}</span></div>
            <div className="flex justify-between"><span className="text-amber-600">Refunds</span><span>{data.refunds}</span></div>
            {data.hourly?.length > 0 && (
              <div className="border-t border-amber-300/60 pt-2">
                <p className="font-semibold mb-1">Hourly</p>
                {data.hourly.map((h: any) => <div key={h.hour} className="flex justify-between text-xs"><span>{String(h.hour).padStart(2, "0")}:00</span><span>{h.count} sales · {fmoney(h.total)}</span></div>)}
              </div>
            )}
            {data.topItems?.length > 0 && (
              <div className="border-t border-amber-300/60 pt-2">
                <p className="font-semibold mb-1">Top 5 Items</p>
                {data.topItems.map((t: any, i: number) => <div key={i} className="flex justify-between text-xs"><span>{i + 1}. {t.name}</span><span>{fmoney(t.revenue)}</span></div>)}
              </div>
            )}
          </CardContent>
        </Card>
      )
    }

    return <p className="text-stone-500 text-center py-16">Select a report type above</p>
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-gold-100 border border-amber-300/60 text-stone-800 rounded-lg px-3 py-1.5 text-sm">
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 bg-gold-100 border-amber-300/60 text-stone-800 h-9" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 bg-gold-100 border-amber-300/60 text-stone-800 h-9" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === t.key ? "bg-primary text-white" : "bg-gold-100 text-stone-500 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {renderContent()}
      </div>
    </div>
  )
}
