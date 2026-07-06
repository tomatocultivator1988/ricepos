"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BanknoteIcon, ShoppingBagIcon, TrendingUpIcon, PackageIcon,
  AlertTriangleIcon, Loader2Icon, PlusIcon, ArrowRightIcon,
  StoreIcon, ShieldCheckIcon, TruckIcon, LayoutDashboardIcon
} from "lucide-react"

const formatCurrency = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [adjLogs, setAdjLogs] = useState<any[]>([])
  const [user, setUser] = useState<{ name: string; role: string; employeeId: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role, employeeId: d.employee.id })
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  useEffect(() => { fetch("/api/dashboard").then(r => r.json()).then(setData) }, [])

  useEffect(() => {
    fetch("/api/backoffice/inventory/log?page=1&limit=15")
      .then(r => r.json())
      .then(d => {
        const logs = (d.logs ?? []).map((l: any) => ({
          id: l.id,
          itemName: l.itemName || (l.items && l.items.name) || "Unknown",
          changeQty: Number(l.change_qty) || 0,
          reason: l.reason || "unknown",
          employeeName: l.employeeName || (l.employees && l.employees.name) || "Unknown",
          createdAt: l.created_at,
          note: l.note,
        }))
        setAdjLogs(logs)
      }).catch(() => {})
  }, [])

  if (!user || !data) return null

  const todayData = data.today || {}
  const lowStockCount = (data.items || []).filter((i: any) => i.track_stock && Number(i.stock_qty) <= Number(i.min_stock)).length
  const activeProducts = (data.items || []).filter((i: any) => i.price > 0).length

  const kpis = [
    { label: "Today's Revenue", value: formatCurrency(todayData.totalSales || 0), sub: `${todayData.orderCount || 0} transactions - ${today}`, icon: BanknoteIcon, color: "from-emerald-500 to-emerald-600" },
    { label: "Avg per Sale", value: formatCurrency(todayData.averageOrder || 0), sub: `${todayData.orderCount || 0} orders today`, icon: TrendingUpIcon, color: "from-blue-500 to-blue-600" },
    { label: "Active Products", value: activeProducts, sub: "Products in catalog", icon: PackageIcon, color: "from-gold-500 to-gold-600" },
    { label: "Low Stock", value: lowStockCount > 0 ? `${lowStockCount} items` : "None", sub: lowStockCount > 0 ? "Needs restock" : "All items fully stocked", icon: AlertTriangleIcon, color: lowStockCount > 0 ? "from-red-500 to-red-600" : "from-emerald-500 to-emerald-600" },
  ]

  const isLoading = !data

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center h-full" />
      ) : (
        <div className="flex flex-col gap-5 p-5">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map(kpi => (
              <div key={kpi.label} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-5 shadow-md ring-1 ring-gold-400/20 hover:ring-gold-400/40 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.color} shadow-lg`}>
                    <kpi.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-gold-300/80">{kpi.label}</p>
                    <p className="text-xl font-extrabold text-white">{kpi.value}</p>
                  </div>
                </div>
                <p className="text-[0.65rem] text-slate-400">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent Sales + Stock Changes */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-5 shadow-md ring-1 ring-gold-400/20">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gold-300">Recent Sales</h2>
                <button onClick={() => router.push("/dashboard/sales")} className="text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  View all <ArrowRightIcon className="h-3 w-3" />
                </button>
              </div>
              {data.recentSales?.length > 0 ? (
                <div className="space-y-2">
                  {data.recentSales?.slice(0, 5).map((sale: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border-2 border-brewhas-700/40 bg-brewhas-950/40 p-2.5 hover:border-gold-400/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/20 text-gold-300 text-xs font-bold ring-1 ring-gold-400/30">#{(sale.saleNumber ? String(sale.saleNumber).padStart(6,'0') : '-')}</div>
                        <div>
                          <p className="text-xs font-semibold text-gold-200">{sale.employeeName || "Cashier"}</p>
                          <p className="text-[0.6rem] text-slate-400">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} - {sale.paymentMethod || "CASH"}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gold-300 tabular-nums">{formatCurrency(Number(sale.total) || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-slate-400">No sales yet today</p>
              )}
            </div>

            <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-5 shadow-md ring-1 ring-gold-400/20">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gold-300">Recent Stock Changes</h2>
                <button onClick={() => router.push("/backoffice/inventory")} className="text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  Inventory <ArrowRightIcon className="h-3 w-3" />
                </button>
              </div>
              {adjLogs.length > 0 ? (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {adjLogs.slice(0, 10).map(log => {
                    const chg = log.changeQty
                    const isPositive = chg >= 0
                    return (
                    <div key={log.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                      !isPositive ? "bg-red-900/20 border border-red-800/30" :
                      log.reason === "delivery" ? "bg-emerald-900/20 border border-emerald-800/30" :
                      "bg-brewhas-800/30 border border-brewhas-700/30"
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold tabular-nums shrink-0 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? `+${chg}` : chg}
                        </span>
                        <span className="text-slate-300 truncate">{log.itemName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
                          !isPositive ? "bg-red-900/40 text-red-400" :
                          log.reason === "delivery" ? "bg-emerald-900/40 text-emerald-400" :
                          "bg-brewhas-700/40 text-slate-300"
                        }`}>
                          {log.reason}
                        </span>
                        <span className="text-slate-500">{log.employeeName}</span>
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-slate-400">No stock changes logged</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-5 shadow-md ring-1 ring-gold-400/20">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gold-300">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "New Sale", desc: "Open POS", icon: PlusIcon, onClick: () => router.push("/pos") },
                { label: "Record Delivery", desc: "Stock in", icon: TruckIcon, onClick: () => router.push("/backoffice/inventory") },
                { label: "Manage Inventory", desc: "Items & stock", icon: ShieldCheckIcon, onClick: () => router.push("/backoffice/inventory") },
                { label: "View Sales", desc: "History & reports", icon: TrendingUpIcon, onClick: () => router.push("/dashboard/sales") },
              ].map(action => (
                <button key={action.label} onClick={action.onClick} className="flex flex-col items-start gap-1 rounded-xl border-2 border-brewhas-700/40 bg-brewhas-950/40 p-4 text-left transition-all hover:border-gold-400/40 hover:bg-brewhas-800/40 hover:shadow-lg">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/20 text-gold-400 ring-1 ring-gold-400/30"><action.icon className="h-4 w-4" /></div>
                  <span className="text-xs font-bold text-gold-200">{action.label}</span>
                  <span className="text-[0.6rem] text-slate-400">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
