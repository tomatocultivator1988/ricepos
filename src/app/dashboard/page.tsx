"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2Icon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface DashboardData {
  todaySales: number; todayProfit: number; todayCash: number; todayGcash: number;
  outstandingUtang: number; lowStockCount: number; expensesToday: number;
  unknownCostItems: number;
  recentSales: { id: string; saleNumber: number; total: number; status: string; createdAt: string }[];
  topProducts: { name: string; qty: number }[];
  salesTrend: { date: string; total: number }[];
  lastCashCount: { variance: number; date: string } | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/dashboard")
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2Icon className="h-8 w-8 animate-spin text-emerald-400" /></div>

  const kpis = [
    { label: "Sales Today", value: `₱${(data?.todaySales ?? 0).toFixed(2)}`, color: "text-white" },
    { label: "Profit Today", value: `${(data?.todayProfit ?? 0) >= 0 ? "₱" : "-₱"}${Math.abs(data?.todayProfit ?? 0).toFixed(2)}`, color: (data?.todayProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Cash Today", value: `₱${(data?.todayCash ?? 0).toFixed(2)}`, color: "text-blue-400" },
    { label: "GCash Today", value: `₱${(data?.todayGcash ?? 0).toFixed(2)}`, color: "text-purple-400" },
    { label: "Outstanding Utang", value: `₱${(data?.outstandingUtang ?? 0).toFixed(2)}`, color: data?.outstandingUtang ? "text-yellow-400" : "text-slate-400" },
    { label: "Low Stock", value: `${data?.lowStockCount ?? 0} items`, color: data?.lowStockCount ? "text-red-400" : "text-slate-400" },
    { label: "Expenses Today", value: `₱${(data?.expensesToday ?? 0).toFixed(2)}`, color: "text-orange-400" },
    { label: "Cash Variance", value: data?.lastCashCount ? `${data.lastCashCount.variance >= 0 ? "+" : ""}₱${data.lastCashCount.variance.toFixed(2)}` : "—", color: (data?.lastCashCount?.variance ?? 0) === 0 ? "text-slate-400" : "text-red-400" },
  ]

  const maxTrend = Math.max(...(data?.salesTrend.map(t => t.total) ?? [0]), 1)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      {data?.unknownCostItems ? <p className="text-xs text-yellow-400">{data.unknownCostItems} sales today have unknown cost — profit is approximate</p> : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Trend */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">14-Day Sales Trend</h2>
          <div className="flex items-end gap-1 h-24">
            {(data?.salesTrend ?? []).map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500 tabular-nums">₱{(t.total / 1000).toFixed(0)}k</span>
                <div className="w-full bg-emerald-500/60 rounded-t" style={{ height: `${(t.total / (maxTrend || 1)) * 100}%` }} />
                <span className="text-[9px] text-slate-600">{new Date(t.date).getDate()}/{new Date(t.date).getMonth() + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Top Products Today</h2>
            {data?.topProducts.length ? (
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{i + 1}. {p.name}</span>
                    <span className="text-slate-400">{Number(p.qty).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-500">No sales yet today</p>}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Sales</h2>
            {data?.recentSales.length ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.recentSales.map(s => (
                  <div key={s.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-800">
                    <span className="text-slate-400">#{String(s.saleNumber).padStart(6, "0")}</span>
                    <span className={`${s.status === "completed" || s.status === "paid" ? "text-emerald-400" : s.status === "partial" || s.status === "unpaid" ? "text-yellow-400" : "text-slate-400"}`}>
                      ₱{s.total.toFixed(2)}
                    </span>
                    <span className="text-slate-600">{new Date(s.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-500">No sales yet today</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
