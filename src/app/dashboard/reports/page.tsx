"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2Icon, TrendingUpIcon, DownloadIcon } from "lucide-react"

function fmtCurrency(n: number) { return `P${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` }
function fmtNum(n: number | null) { return n != null ? String(n).padStart(6, '0') : '-' }

type ReportData = {
  summary: {
    grossSales: number; vatCollected: number; vatExemptSales: number
    discountsGiven: number; netSales: number; totalTransactions: number
    voidedCount: number; voidedTotal: number; refundedCount: number; refundedTotal: number
  }
  cashiers: { name: string; count: number; total: number }[]
  voidReasons: { reason: string; count: number }[]
  recentSales: { id: string; saleNumber: number; total: number; subtotal: number; taxTotal: number; discountAmt: number; status: string; cashier: string; createdAt: string; voidReason: string | null }[]
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/reports?from=${from}&to=${to}`)
      if (res.ok) setData(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const exportCSV = () => {
    if (!data) return
    const rows = [["Receipt#", "Cashier", "Date", "Subtotal", "VAT", "Discount", "Total", "Status"]]
    for (const s of data.recentSales) {
      rows.push([fmtNum(s.saleNumber), s.cashier, new Date(s.createdAt).toLocaleString("en-PH"),
      String(s.subtotal), String(s.taxTotal), String(s.discountAmt), String(s.total), s.status])
    }
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `brewhas-report-${from}-${to}.csv`; a.click()
  }

  const s = data?.summary

  return (
    <div className="p-5 space-y-5">
      <h1 className="text-2xl font-bold text-gold-200 flex items-center gap-2">
        <TrendingUpIcon className="h-6 w-6" /> Sales Reports
      </h1>

      <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-slate-400">From</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-slate-400">To</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl" />
            </div>
            <Button onClick={fetchData} className="bg-brewhas-700 hover:bg-brewhas-800 text-white rounded-xl">Generate</Button>
            {data && (
              <Button onClick={exportCSV} variant="outline" className="rounded-xl border-brewhas-700/40 text-gold-300"><DownloadIcon className="mr-1 h-4 w-4" /> CSV</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2Icon className="h-8 w-8 animate-spin text-brewhas-600" /></div>
      ) : !s ? (
        <p className="text-center py-12 text-slate-400">Select date range and generate report</p>
      ) : (
        <>
          {/* Sales Summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Gross Sales", value: fmtCurrency(s.grossSales), color: "bg-emerald-100 text-emerald-700" },
              { label: "Net Sales", value: fmtCurrency(s.netSales), color: "bg-blue-100 text-blue-700" },
              { label: "VAT Collected", value: fmtCurrency(s.vatCollected), color: "bg-purple-100 text-purple-700" },
              { label: "Discounts", value: fmtCurrency(s.discountsGiven), color: "bg-amber-100 text-amber-700" },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md">
                <p className="text-xs font-bold uppercase text-slate-400">{kpi.label}</p>
                <p className="text-xl font-extrabold text-gold-200">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Transaction Counts */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Transactions", value: s.totalTransactions, color: "bg-green-50 text-green-700" },
              { label: "Voided", value: `${s.voidedCount} (${fmtCurrency(s.voidedTotal)})`, color: "bg-red-50 text-red-700" },
              { label: "Refunded", value: `${s.refundedCount} (${fmtCurrency(s.refundedTotal)})`, color: "bg-orange-50 text-orange-700" },
            ].map(kpi => (
              <div key={kpi.label} className={`rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md`}>
                <p className="text-xs font-bold uppercase text-slate-400">{kpi.label}</p>
                <p className="text-xl font-extrabold text-gold-200">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Cashier Report */}
          {data.cashiers.length > 0 && (
            <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md overflow-hidden">
              <CardContent className="p-0">
                <div className="px-5 py-3 border-b border-brewhas-700/50">
                  <h3 className="text-sm font-bold text-gold-300">Cashier Sales Report</h3>
                </div>
                <div className="p-3 space-y-2">
                  {data.cashiers.map(c => (
                    <div key={c.name} className="flex justify-between items-center rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-gold-300">{c.name}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-400">{c.count} sales</span>
                        <span className="font-bold text-gold-200">{fmtCurrency(c.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Void Reasons */}
          {data.voidReasons.length > 0 && (
            <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md overflow-hidden">
              <CardContent className="p-0">
                <div className="px-5 py-3 border-b border-brewhas-700/50">
                  <h3 className="text-sm font-bold text-gold-300">Void Report</h3>
                </div>
                <div className="p-3 space-y-2">
                  {data.voidReasons.map(r => (
                    <div key={r.reason} className="flex justify-between items-center rounded-lg bg-red-50 px-3 py-2 text-sm">
                      <span className="text-red-700">{r.reason}</span>
                      <span className="font-bold text-red-600">{r.count} void{r.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Sales Table */}
          <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 py-3 border-b border-brewhas-700/50 flex justify-between">
                <h3 className="text-sm font-bold text-gold-300">Recent Transactions</h3>
                <span className="text-xs text-slate-400">{from} to {to}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-400">Receipt#</th>
                      <th className="text-left px-3 py-2 text-slate-400">Cashier</th>
                      <th className="text-left px-3 py-2 text-slate-400">Date</th>
                      <th className="text-right px-3 py-2 text-slate-400">Subtotal</th>
                      <th className="text-right px-3 py-2 text-slate-400">VAT</th>
                      <th className="text-right px-3 py-2 text-slate-400">Discount</th>
                      <th className="text-right px-3 py-2 text-slate-400">Total</th>
                      <th className="text-left px-3 py-2 text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentSales.map(sale => (
                      <tr key={sale.id} className={sale.status === "voided" ? "bg-red-50/30" : sale.status === "refunded" ? "bg-orange-50/30" : ""}>
                        <td className="px-3 py-2 font-mono text-gold-300">#{fmtNum(sale.saleNumber)}</td>
                        <td className="px-3 py-2 text-gold-400">{sale.cashier}</td>
                        <td className="px-3 py-2 text-slate-400">{new Date(sale.createdAt).toLocaleDateString("en-PH")}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtCurrency(sale.subtotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtCurrency(sale.taxTotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-500">{sale.discountAmt > 0 ? '-' + fmtCurrency(sale.discountAmt) : '0'}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold">{fmtCurrency(sale.total)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sale.status === "completed" ? "bg-green-100 text-green-700" : sale.status === "voided" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
