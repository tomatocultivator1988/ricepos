"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  LogOutIcon, StoreIcon, LayoutDashboardIcon, TrendingUpIcon,
  TruckIcon, ShieldCheckIcon, BoxesIcon, UsersIcon, Clock,
  Loader2Icon
} from "lucide-react"

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { hour: "2-digit", minute: "2-digit" })
}

function eventBadge(type: string) {
  const map: Record<string, string> = {
    sale: "bg-green-100 text-green-700 border-green-200",
    void_transaction: "bg-red-100 text-red-700 border-red-200",
    void_line: "bg-amber-100 text-amber-700 border-amber-200",
    refund: "bg-purple-100 text-purple-700 border-purple-200",
    return_exchange: "bg-blue-100 text-blue-700 border-blue-200",
  }
  return map[type] || "bg-slate-100 text-gold-400 border-slate-200"
}

export default function JournalPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role })
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  useEffect(() => {
    fetch("/api/dashboard/journal").then(r => r.json()).then(d => {
      setEvents(d.events ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  const navLinks = [
    { label: "POS", href: "/pos", icon: StoreIcon },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { label: "Sales", href: "/dashboard/sales", icon: TrendingUpIcon },
    { label: "Inventory", href: "/backoffice/inventory", icon: BoxesIcon },
    { label: "Journal", href: "/dashboard/journal", icon: ShieldCheckIcon },
  ]

  if (!user) return null

  return (
    <div className="flex h-screen flex-col bg-transparent">


      <div className="flex-1 overflow-y-auto p-5">
        <h1 className="text-2xl font-bold text-gold-200 mb-4">Electronic Journal</h1>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2Icon className="h-8 w-8 animate-spin text-brewhas-600" /></div>
        ) : events.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No events recorded yet</p>
        ) : (
          <div className="space-y-2">
            {events.map(e => (
              <div key={e.id} className="rounded-xl border border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${eventBadge(e.eventType)}`}>
                    {e.eventType.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400">{formatTime(e.createdAt)}</span>
                </div>
                <p className="text-sm text-gold-400">
                  {e.employeeName}
                  {e.details?.reason && <span className="text-slate-400"> - {e.details.reason}</span>}
                  {e.details?.total != null && <span className="font-semibold text-gold-300 ml-2">₱{e.details.total}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
