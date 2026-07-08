"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon } from "lucide-react"

export function ShiftsManager() {
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
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Shift Records</h2>
      <div className="flex gap-2">
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 bg-gold-100 border-amber-300/60 text-stone-800 h-9" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 bg-gold-100 border-amber-300/60 text-stone-800 h-9" />
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-amber-600" /></div> : (
        <div className="space-y-3">
          {shifts.map((s: any) => {
            const openCount = s.opening_denoms ? Object.values(s.opening_denoms).reduce((a: number, b: any) => a + Number(b), 0) : 0
            const closeCount = s.closing_denoms ? Object.values(s.closing_denoms).reduce((a: number, b: any) => a + Number(b), 0) : 0
            return (
              <Card key={s.id} className="bg-gold-200/90 border-amber-300/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={s.status === "open" ? "bg-green-600" : "bg-stone-600"}>{s.status === "open" ? "OPEN" : "CLOSED"}</Badge>
                      <span className="text-sm font-semibold text-amber-600">{s.employeeName}</span>
                    </div>
                    <span className="text-xs text-stone-500">
                      {new Date(s.opened_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {s.closed_at ? ` — ${new Date(s.closed_at).toLocaleString("en-PH", { hour: "2-digit", minute: "2-digit" })}` : " — now"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-stone-500">Opening</p>
                      <p className="text-sm font-bold text-stone-800">₱{Number(s.opening_cash).toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-stone-500">Cash Sales</p>
                      <p className="text-sm font-bold text-amber-600">₱{Number(s.cash_sales).toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-stone-500">Collections</p>
                      <p className="text-sm font-bold text-amber-600">₱{Number(s.cash_collections).toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-stone-500">Expected</p>
                      <p className="text-sm font-bold text-blue-700">₱{Number(s.expected_cash).toFixed(2)}</p>
                    </div>
                    {s.status === "closed" && (
                      <>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-stone-500">Counted</p>
                          <p className="text-sm font-bold text-stone-800">₱{Number(s.closing_cash).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-stone-500">Variance</p>
                          <p className={`text-sm font-bold ${Number(s.variance) >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {Number(s.variance) >= 0 ? "+" : ""}₱{Number(s.variance).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-stone-500">Balance</p>
                          <p className={`text-sm font-bold ${Number(s.variance) === 0 ? "text-green-700" : Number(s.variance) > 50 || Number(s.variance) < -50 ? "text-red-600" : "text-yellow-600"}`}>
                            {Number(s.variance) === 0 ? "BALANCED" : `${Number(s.variance) >= 0 ? "OVER" : "SHORT"}`}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

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
