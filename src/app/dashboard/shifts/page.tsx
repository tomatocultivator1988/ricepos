"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon } from "lucide-react"

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0])
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/shifts?from=${from}&to=${to}`).then(r => r.json()).then(d => {
      setShifts(d.shifts ?? [])
      setLoading(false)
    })
  }, [from, to])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Shift Records</h1>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 bg-stone-800 border-amber-600/30 text-white h-9" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 bg-stone-800 border-amber-600/30 text-white h-9" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-amber-400" /></div> : (
        <div className="space-y-3">
          {shifts.map((s: any) => {
            const openCount = s.opening_denoms ? Object.values(s.opening_denoms).reduce((a: number, b: any) => a + Number(b), 0) : 0
            const closeCount = s.closing_denoms ? Object.values(s.closing_denoms).reduce((a: number, b: any) => a + Number(b), 0) : 0
            return (
              <Card key={s.id} className="bg-stone-900/60 border-amber-600/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={s.status === "open" ? "bg-green-600" : "bg-stone-600"}>{s.status === "open" ? "OPEN" : "CLOSED"}</Badge>
                      <span className="text-sm font-semibold text-amber-300">{s.employeeName}</span>
                    </div>
                    <span className="text-xs text-stone-400">
                      {new Date(s.opened_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {s.closed_at ? ` — ${new Date(s.closed_at).toLocaleString("en-PH", { hour: "2-digit", minute: "2-digit" })}` : " — now"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                    <div className="bg-stone-800/50 rounded-lg p-2">
                      <p className="text-stone-400">Opening</p>
                      <p className="text-sm font-bold text-white">₱{Number(s.opening_cash).toFixed(2)}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-lg p-2">
                      <p className="text-stone-400">Cash Sales</p>
                      <p className="text-sm font-bold text-amber-300">₱{Number(s.cash_sales).toFixed(2)}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-lg p-2">
                      <p className="text-stone-400">Collections</p>
                      <p className="text-sm font-bold text-amber-300">₱{Number(s.cash_collections).toFixed(2)}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-lg p-2">
                      <p className="text-stone-400">Expected</p>
                      <p className="text-sm font-bold text-blue-300">₱{Number(s.expected_cash).toFixed(2)}</p>
                    </div>
                    {s.status === "closed" && (
                      <>
                        <div className="bg-stone-800/50 rounded-lg p-2">
                          <p className="text-stone-400">Counted</p>
                          <p className="text-sm font-bold text-white">₱{Number(s.closing_cash).toFixed(2)}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-lg p-2">
                          <p className="text-stone-400">Variance</p>
                          <p className={`text-sm font-bold ${Number(s.variance) >= 0 ? "text-green-300" : "text-red-400"}`}>
                            {Number(s.variance) >= 0 ? "+" : ""}₱{Number(s.variance).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-stone-800/50 rounded-lg p-2">
                          <p className="text-stone-400">Balance</p>
                          <p className={`text-sm font-bold ${Number(s.variance) === 0 ? "text-green-300" : Number(s.variance) > 50 || Number(s.variance) < -50 ? "text-red-400" : "text-yellow-300"}`}>
                            {Number(s.variance) === 0 ? "BALANCED" : `${Number(s.variance) >= 0 ? "OVER" : "SHORT"}`}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Open shift: show live denomination hint */}
                  {s.status === "open" && openCount > 0 && (
                    <div className="mt-2 text-xs text-stone-500">
                      Opened with {openCount} pieces across {Object.values(s.opening_denoms).filter((v: any) => Number(v) > 0).length} denominations
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {shifts.length === 0 && <p className="text-center text-stone-500 py-16">No shifts in this date range</p>}
        </div>
      )}
    </div>
  )
}
