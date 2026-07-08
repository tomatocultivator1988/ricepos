"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface NumpadProps {
  value: string
  onChange: (value: string) => void
  onDismiss: () => void
  label?: string
  allowDecimal?: boolean
}

const keys = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0", ".", "⌫"],
]

export function Numpad({ value, onChange, onDismiss, label, allowDecimal = true }: NumpadProps) {
  function handleKey(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1))
      return
    }
    if (key === ".") {
      if (!allowDecimal || value.includes(".")) return
      if (value === "" || value === "0") {
        onChange("0.")
        return
      }
      onChange(value + ".")
      return
    }
    if (key === "0" && value === "0") return
    if (value === "0" && key !== ".") {
      onChange(key)
      return
    }
    // Limit to 10 digits
    if (value.replace(".", "").length >= 10) return
    onChange(value + key)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D3B1E]/95 border-t border-amber-300/60 p-3 pb-5 shadow-[0_-8px_24px_rgba(0,0,0,0.3)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          {label && <span className="text-xs text-stone-300">{label}</span>}
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {value || "0"}
            <span className="animate-pulse text-amber-300 ml-0.5">|</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-stone-300 hover:text-white"
          onClick={onDismiss}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((row, ri) => (
          row.map((key) => (
            <button
              key={`${ri}-${key}`}
              onClick={() => handleKey(key)}
              className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-95 select-none
                ${key === "⌫"
                  ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                  : key === "."
                    ? "bg-primary/10 text-amber-300 border border-amber-300/30 hover:bg-primary/20"
                    : "bg-white/10 text-white border border-white/15 hover:bg-white/20"
                }`}
            >
              {key}
            </button>
          ))
        ))}
      </div>

      {/* Enter button */}
      <button
        onClick={onDismiss}
        className="w-full mt-2 h-12 rounded-xl bg-primary text-primary-foreground text-lg font-bold transition-all active:scale-95 hover:bg-amber-400"
      >
        ✓ Done
      </button>
    </div>
  )
}
