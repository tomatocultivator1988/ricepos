"use client"

import { useState, useEffect } from "react"
import { Loader2Icon, DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  function exportCSV(rows: any[], headers: string[]) {
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${activeTab}_${from}_${to}.csv`; a.click()
  }

  function num(v: any) { return Number(v ?? 0).toFixed(2) }

  const tabs = ["sales", "profit", "products", "receivables", "inventory", "voids", "zreading"]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm">
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 bg-slate-800 border-slate-700 text-white h-9" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 bg-slate-800 border-slate-700 text-white h-9" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700 p-1 rounded-lg flex-wrap h-auto">
          {tabs.map(t => <TabsTrigger key={t} value={t} className="capitalize data-[state=active]:bg-emerald-600 text-xs px-3 py-1.5 rounded-md">{t}</TabsTrigger>)}
        </TabsList>

        <div className="mt-4">
          {loading ? <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-emerald-400" /></div> : (
            <>
              {data?.rows && (
                <>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" size="sm" onClick={() => exportCSV(data.rows, Object.keys(data.rows[0]))} className="text-xs gap-1"><DownloadIcon className="h-3 w-3"/> CSV</Button>
                  </div>
                  <Card className="bg-slate-900 border-slate-700 overflow-x-auto">
                    <CardContent className="p-0">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-700">{Object.keys(data.rows[0] || {}).map(k => <th key={k} className="text-left px-3 py-2 text-slate-400 font-medium capitalize">{k}</th>)}</tr></thead>
                        <tbody>{data.rows.map((r: any) => <tr key={r.id || Math.random()} className="border-b border-slate-800 hover:bg-slate-800/50">
                          {Object.entries(r).map(([k, v]) => (
                            <td key={k} className={`px-3 py-1.5 text-slate-300 ${typeof v === "number" ? "text-right tabular-nums" : ""}`}>
                              {typeof v === "number" ? `₱${num(v)}` : String(v ?? "\u2014")}
                            </td>
                          ))}
                        </tr>)}</tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeTab === "zreading" && data && (
                <Card className="bg-slate-900 border-slate-700 max-w-lg mx-auto text-white text-sm">
                  <CardContent className="p-6 space-y-3">
                    <div className="text-center">
                      <h2 className="font-bold text-lg">Z-READING</h2>
                      <p className="text-xs text-slate-400">{from} to {to}</p>
                    </div>
                    <div className="space-y-1 border-y border-slate-700 py-2">
                      <div className="flex justify-between"><span>Gross Sales</span><span>₱{num(data.gross)}</span></div>
                      <div className="flex justify-between"><span className="text-red-400">Discounts</span><span className="text-red-400">-₱{num(data.discounts)}</span></div>
                      <div className="flex justify-between"><span>Tax</span><span>₱{num(data.tax)}</span></div>
                      <div className="flex justify-between font-bold"><span>NET SALES</span><span>₱{num(data.net)}</span></div>
                    </div>
                    <div className="flex justify-between"><span>Cash</span><span>₱{num(data.cash)}</span></div>
                    <div className="flex justify-between"><span>GCash</span><span>₱{num(data.gcash)}</span></div>
                    <div className="flex justify-between"><span>Sales Count</span><span>{data.saleCount}</span></div>
                    <div className="flex justify-between"><span className="text-red-400">Voids</span><span>{data.voids}</span></div>
                    <div className="flex justify-between"><span className="text-amber-400">Refunds</span><span>{data.refunds}</span></div>
                    {(data.hourly ?? []).length > 0 && (
                      <div className="border-t border-slate-700 pt-2">
                        <p className="font-semibold mb-1">Hourly</p>
                        {data.hourly.map((h: any) => <div key={h.hour} className="flex justify-between text-xs"><span>{String(h.hour).padStart(2,"0")}:00</span><span>{h.count} sales · ₱{num(h.total)}</span></div>)}
                      </div>
                    )}
                    {data.topItems?.length > 0 && (
                      <div className="border-t border-slate-700 pt-2">
                        <p className="font-semibold mb-1">Top 5 Items</p>
                        {data.topItems.map((t: any, i: number) => <div key={i} className="flex justify-between text-xs"><span>{i+1}. {t.name}</span><span>₱{num(t.revenue)}</span></div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </Tabs>
    </div>
  )
}
