"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, LogOut, User } from "lucide-react"

function ClockWidget() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }))
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums text-sm text-muted-foreground">
      <Clock className="size-3.5" />
      {time}
    </span>
  )
}

interface PosHeaderProps {
  cashier: { id: string; name: string; role: string }
  onEndSession: () => void
}

export function PosHeader({ cashier, onEndSession }: PosHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-brewhas-50/60 px-5 py-2.5">
      <div className="flex items-center gap-6">
        <div className="flex flex-col leading-tight">
          <span className="font-display text-lg font-bold tracking-tight text-primary">
            Brewhas Coffeehouse
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Brewhas Coffeehouse
          </span>
        </div>
        {cashier.role === "admin" && (
          <nav className="flex gap-1">
            <Link
              href="/dashboard"
              className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/backoffice"
              className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              Backoffice
            </Link>
          </nav>
        )}
      </div>
      <div className="flex items-center gap-5">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="size-3.5" />
          <span className="font-medium text-foreground">{cashier.name}</span>
        </span>
        <button
          onClick={onEndSession}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-destructive"
        >
          <LogOut className="size-3.5" />
          End Session
        </button>
        <ClockWidget />
      </div>
    </header>
  )
}
