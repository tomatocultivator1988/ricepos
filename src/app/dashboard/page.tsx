"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2Icon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
    { label: "Outstanding Utang", value: `₱${(data?.outstandingUtang ?? 0).toFixed(2)}`, color: data?.outstandingUtang ? "text-yellow-400" : "text-stone-400" },
    { label: "Low Stock", value: `${data?.lowStockCount ?? 0} items`, color: data?.lowStockCount ? "text-red-400" : "text-stone-400" },
    { label: "Expenses Today", value: `₱${(data?.expensesToday ?? 0).toFixed(2)}`, color: "text-orange-400" },
    { label: "Cash Variance", value: data?.lastCashCount ? `${data.lastCashCount.variance >= 0 ? "+" : ""}₱${data.lastCashCount.variance.toFixed(2)}` : "—", color: (data?.lastCashCount?.variance ?? 0) === 0 ? "text-stone-400" : "text-red-400" },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      {data?.unknownCostItems ? <p className="text-xs text-yellow-400">{data.unknownCostItems} sales today have unknown cost — profit is approximate</p> : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border-amber-600/30 bg-stone-900/60">
            <CardContent className="p-4">
              <p className="text-xs text-stone-400">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Trend — Recharts */}
      <Card className="border-amber-600/30 bg-stone-900/60">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">14-Day Sales Trend</h2>
          {data?.salesTrend.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={v => `${new Date(v).getDate()}/${new Date(v).getMonth()+1}`} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₱${Number(v).toFixed(2)}`, "Sales"]} />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-stone-500 py-8 text-center">No sales data yet</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products — Recharts */}
        <Card className="border-amber-600/30 bg-stone-900/60">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-amber-300 mb-3">Top Products Today</h2>
            {data?.topProducts.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#d1d5db" }} />
                  <Tooltip formatter={(v: any) => [v, "Qty Sold"]} />
                  <Bar dataKey="qty" fill="#f59e0b" barSize={16} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-stone-500 py-8 text-center">No sales yet today</p>}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="border-amber-600/30 bg-stone-900/60">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-stone-300 mb-3">Recent Sales</h2>
            {data?.recentSales.length ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.recentSales.map(s => (
                  <div key={s.id} className="flex justify-between items-center text-xs py-1 border-b border-amber-600/30">
                    <span className="text-stone-400">#{String(s.saleNumber).padStart(6, "0")}</span>
                    <span className={`${s.status === "completed" || s.status === "paid" ? "text-emerald-400" : s.status === "partial" || s.status === "unpaid" ? "text-yellow-400" : "text-stone-400"}`}>
                      ₱{s.total.toFixed(2)}
                    </span>
                    <span className="text-stone-600">{new Date(s.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-stone-500">No sales yet today</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
