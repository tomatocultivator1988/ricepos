"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, LayoutDashboardIcon, StoreIcon } from "lucide-react"

export default function PosPage() {
  const [user, setUser] = useState<{ name: string; role: string; employeeId: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role, employeeId: d.employee.id })
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  if (!user) return null

  return (
    <div className="flex h-screen flex-col bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center bg-no-repeat z-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brewhas-950/85 via-brewhas-900/75 to-brewhas-950/85 z-0" />

      <header className="relative z-10 flex items-center justify-between border-b-2 border-gold-500/50 bg-gradient-to-r from-brewhas-700 via-brewhas-700 to-brewhas-800 px-3 sm:px-4 py-3 text-white">
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/85 to-transparent animate-gold-shimmer bg-[length:200%_100%]" />
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-white/25 ring-1 ring-gold-400/60 overflow-hidden">
            <img src="/logo.png" alt="GroceryPOS" className="h-full w-full object-contain p-0.5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm sm:text-base font-bold leading-tight">GroceryPOS</h1>
            <p className="text-[0.6rem] sm:text-[0.7rem] font-medium text-gold-300">Point of Sale</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/25 px-2 sm:px-3 py-1">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gold-500 text-xs font-extrabold text-brewhas-950">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-gold-200 truncate max-w-[80px]">{user.name}</span>
          </div>
          {user.role === "admin" && (
            <button onClick={() => router.push("/dashboard")} className="rounded-full p-2 text-gold-300 hover:bg-gold-400/25 hover:text-gold-200 transition-colors">
              <LayoutDashboardIcon className="h-5 w-5" />
            </button>
          )}
          <button onClick={handleLogout} className="rounded-full border border-gold-400/40 bg-gold-400/25 p-2 text-gold-300 hover:bg-red-500/30 hover:text-white transition-all">
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="text-center">
          <StoreIcon className="h-16 w-16 text-gold-300 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-gold-200">POS Terminal</h2>
          <p className="mt-2 text-sm text-slate-400">Coming Soon</p>
        </div>
      </div>
    </div>
  )
}
