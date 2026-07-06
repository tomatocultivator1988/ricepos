"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Loader2Icon, LogOutIcon, StoreIcon, LayoutDashboardIcon, TrendingUpIcon,
  PackageIcon, BoxesIcon, UsersIcon, ShieldCheckIcon, TruckIcon, AlertTriangleIcon,
  CheckCircleIcon, InfoIcon
} from "lucide-react"

type AuditItem = {
  name: string
  starting: number
  deliveries: number
  sales: number
  adjustments: number
  expected: number
  reported: number
  variance: number
  estimatedLoss: number
}

function fmtCurrency(n: number) {
  return `P${n.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`
}

export default function AuditPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [data, setData] = useState<{ ingredients: AuditItem[]; totalLossValue: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role })
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  const fetchAudit = async () => {
    if (!from || !to) return
    setLoading(true)
    try {
      const res = await fetch(`/api/shifts/audit?from=${from}&to=${to}`)
      if (res.ok) setData(await res.json())
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAudit() }, [])

  const hasVariance = data?.ingredients.some(i => i.variance !== 0)

  const navLinks = [
    { label: "POS", href: "/pos", icon: StoreIcon },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { label: "Sales", href: "/dashboard/sales", icon: TrendingUpIcon },
    { label: "Deliveries", href: "/dashboard/deliveries", icon: TruckIcon },
    { label: "Audit", href: "/dashboard/audit", icon: ShieldCheckIcon },
    { label: "Employees", href: "/backoffice/employees", icon: UsersIcon },
  ]

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-transparent">
      <Loader2Icon className="h-8 w-8 animate-spin text-gold-300" />
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-transparent">

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gold-300 flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6" />
            Stock Audit Report
          </h1>

          <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-slate-400">From</label>
                  <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
                    className="rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-slate-400">To</label>
                  <Input type="date" value={to} onChange={e => setTo(e.target.value)}
                    className="rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl" />
                </div>
                <Button onClick={fetchAudit} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                  Run Audit
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2Icon className="h-8 w-8 animate-spin text-gold-300" /></div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <ShieldCheckIcon className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">Select date range and run audit</p>
            </div>
          ) : (
            <>
              {data.totalLossValue > 0 && (
                <Card className="rounded-2xl border-2 border-red-200 bg-red-50 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangleIcon className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Estimated Unaccounted Value</p>
                        <p className="text-2xl font-extrabold text-red-700">{fmtCurrency(data.totalLossValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="hidden md:block">
                <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-transparent/50">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-gold-300">Ingredient</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Start</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Delivered</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Sold</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Expected</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Reported</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Variance</TableHead>
                        <TableHead className="text-xs font-bold text-gold-300 text-right">Est. Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ingredients.map(item => {
                        const isMajor = Math.abs(item.variance) > 2 || item.estimatedLoss >= 200
                        const isMinor = item.variance !== 0 && Math.abs(item.variance) <= 2 && item.estimatedLoss < 200
                        const rowClass = isMajor ? "bg-red-50/30" : isMinor ? "bg-amber-50/30" : ""
                        const varClass = isMajor ? "text-red-600" : isMinor ? "text-amber-600" : "text-emerald-600"
                        const status = isMajor ? "MAJOR" : isMinor ? "MINOR" : "OK"
                        return (
                        <TableRow key={item.name} className={rowClass}>
                          <TableCell className="text-sm font-medium text-gold-300">
                            {item.name}
                            {isMinor && <span className="ml-2 text-[0.6rem] text-amber-500">âš  counting?</span>}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{item.starting}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums text-emerald-600">+{item.deliveries}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{item.sales}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums font-semibold">{item.expected}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{item.reported}</TableCell>
                          <TableCell className={`text-sm text-right tabular-nums font-bold ${varClass}`}>
                            {item.variance === 0 ? "0" : item.variance}
                          </TableCell>
                          <TableCell className={`text-sm text-right tabular-nums font-bold ${item.estimatedLoss > 0 ? varClass : "text-slate-400"}`}>
                            {item.estimatedLoss > 0 ? fmtCurrency(item.estimatedLoss) : "â€”"}
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              <div className="md:hidden space-y-3">
                {data.ingredients.map(item => {
                  const isMajor = Math.abs(item.variance) > 2 || item.estimatedLoss >= 200
                  const isMinor = item.variance !== 0 && Math.abs(item.variance) <= 2 && item.estimatedLoss < 200
                  const cardClass = isMajor ? "border-red-200 bg-red-50/30" : isMinor ? "border-amber-200 bg-amber-50/30" : "border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl"
                  return (
                  <Card key={item.name} className={`rounded-2xl border-2 shadow-sm ${cardClass}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gold-200">{item.name}</span>
                        {isMajor ? <AlertTriangleIcon className="h-4 w-4 text-red-600" /> :
                         isMinor ? <InfoIcon className="h-4 w-4 text-amber-600" /> :
                         <CheckCircleIcon className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                        <span>Start: {item.starting}</span>
                        <span>Delivered: +{item.deliveries}</span>
                        <span>Sold: {item.sales}</span>
                        <span>Expected: {item.expected}</span>
                        <span>Reported: {item.reported}</span>
                        <span className={isMajor ? "text-red-600 font-bold" : isMinor ? "text-amber-600 font-bold" : "text-emerald-600"}>
                          Variance: {item.variance}
                        </span>
                      </div>
                      {item.estimatedLoss > 0 && (
                        <div className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
                          isMajor ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          Loss: {fmtCurrency(item.estimatedLoss)}
                        </div>
                      )}
                      {isMinor && <p className="mt-1 text-[0.6rem] text-amber-500">Possible counting error</p>}
                    </CardContent>
                  </Card>
                )})}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
