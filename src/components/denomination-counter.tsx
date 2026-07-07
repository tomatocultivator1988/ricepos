"use client"

import { useState, useEffect } from "react"

export const PESO_DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25]

export interface DenomState { [key: string]: number }

export function calcDenomTotal(denoms: DenomState): number {
  return PESO_DENOMS.reduce((sum, d) => sum + (d * (denoms[String(d)] || 0)), 0)
}

export function DenominationCounter({
  value,
  onChange,
}: {
  value: DenomState
  onChange: (denoms: DenomState, total: number) => void
}) {
  const [denoms, setDenoms] = useState<DenomState>(value || {})

  useEffect(() => { setDenoms(value || {}) }, [])

  function update(d: number, count: string) {
    const n = Math.max(0, Math.floor(Number(count) || 0))
    const next = { ...denoms, [String(d)]: n }
    setDenoms(next)
    onChange(next, calcDenomTotal(next))
  }

  const total = calcDenomTotal(denoms)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-sm">
        <div className="text-xs font-semibold text-stone-500">Denomination</div>
        <div className="text-xs font-semibold text-stone-500 text-center w-16">Count</div>
        <div className="text-xs font-semibold text-stone-500 text-right w-24">Subtotal</div>
        {PESO_DENOMS.map(d => {
          const count = denoms[String(d)] || 0
          const sub = d * count
          return (
            <div key={d} className="contents">
              <div className="flex items-center text-stone-200 py-1">
                <span className="font-medium">{d >= 1 ? `₱${d.toLocaleString()}` : `₱0.25`}</span>
                <span className="ml-1 text-[10px] text-stone-500">{d >= 20 ? "bill/coin" : "coin"}</span>
              </div>
              <input
                type="number" min="0" inputMode="numeric"
                value={count || ""}
                onChange={e => update(d, e.target.value)}
                placeholder="0"
                className="w-16 h-9 rounded bg-gold-100 border border-amber-300/60 text-center text-stone-800 text-sm focus:outline-none focus:border-primary py-1"
              />
              <div className="text-right w-24 tabular-nums text-stone-700 self-center py-1">
                {sub > 0 ? `₱${sub.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between items-center border-t border-amber-300/60 pt-2 mt-2">
        <span className="font-semibold text-amber-600">TOTAL CASH</span>
        <span className="text-lg font-bold text-white tabular-nums">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  )
}
