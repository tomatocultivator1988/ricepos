"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

interface PinEntryProps {
  onVerified: (employee: { id: string; name: string; role: string }) => void
}

export function PinEntry({ onVerified }: PinEntryProps) {
  const [pin, setPin] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlePress = useCallback(async (digit: string) => {
    if (loading || pin.length >= 4) return
    const newPin = [...pin, digit]
    setPin(newPin)
    setError(false)

    if (newPin.length === 4) {
      setLoading(true)
      try {
        const res = await fetch("/api/pos/pin-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: newPin.join("") }),
        })

        if (!res.ok) {
          setError(true)
          setTimeout(() => setPin([]), 600)
          return
        }

        const data = await res.json()
        onVerified(data.employee)
      } catch {
        setError(true)
        setTimeout(() => setPin([]), 600)
      } finally {
        setLoading(false)
      }
    }
  }, [pin, loading, onVerified])

  const handleDelete = useCallback(() => {
    if (loading) return
    setPin(pin.slice(0, -1))
    setError(false)
  }, [pin, loading])

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-950">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-100">Cashier Login</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your 4-digit PIN</p>
        </div>

        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg transition-all duration-150 ${
                error ? "border-red-500 animate-shake" : pin[i] ? "border-emerald-500 bg-emerald-500/10" : "border-gray-700 bg-gray-900"
              }`}
            >
              {pin[i] ? (
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handlePress(String(n))}
              disabled={loading}
              className="flex h-14 items-center justify-center rounded-lg bg-gray-900 text-xl font-semibold text-gray-100 transition-colors hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50"
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleDelete}
            disabled={loading || pin.length === 0}
            className="flex h-14 items-center justify-center rounded-lg bg-gray-900 text-sm text-gray-400 transition-colors hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50"
          >
            ⌫
          </button>
          <button
            onClick={() => handlePress("0")}
            disabled={loading}
            className="flex h-14 items-center justify-center rounded-lg bg-gray-900 text-xl font-semibold text-gray-100 transition-colors hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50"
          >
            0
          </button>
          <div />
        </div>

        {error && (
          <p className="text-center text-sm text-red-400">Invalid PIN. Try again.</p>
        )}
      </div>
    </div>
  )
}
