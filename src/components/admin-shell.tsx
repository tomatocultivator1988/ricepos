"use client"

import { useRouter, usePathname } from "next/navigation"
import { LogOutIcon, LayoutDashboardIcon } from "lucide-react"
import { adminNavLinks } from "@/lib/nav-links"

interface AdminShellProps {
  name: string
  children: React.ReactNode
}

export function AdminShell({ name, children }: AdminShellProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  return (
    <div className="flex h-screen flex-col bg-brewhas-950">
      {/* BG image + overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[url('/background.jpg')] bg-cover bg-center bg-no-repeat z-0" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-brewhas-950/85 via-brewhas-900/75 to-brewhas-950/85 z-0" />

      <header className="relative z-10 flex items-center justify-between border-b-2 border-gold-500/50 bg-gradient-to-r from-brewhas-700 via-brewhas-700 to-brewhas-800 px-3 sm:px-4 py-3 text-white shrink-0 shadow-md">
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/85 to-transparent animate-gold-shimmer bg-[length:200%_100%]" />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white/25 ring-1 ring-gold-400/60 overflow-hidden">
            <img src="/logo.png" alt="Brewhas" className="h-full w-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="hidden sm:block text-sm sm:text-base font-bold leading-tight tracking-tight truncate">GroceryPOS</h1>
            <p className="hidden sm:block text-[0.6rem] sm:text-[0.7rem] font-medium text-gold-300 leading-tight">Admin Panel</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {adminNavLinks.map(link => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                pathname.startsWith(link.href) && link.href !== "/pos" ? "bg-gold-500 text-brewhas-950 shadow-lg shadow-gold-500/25" : "text-gold-300 hover:bg-gold-400/15 hover:text-gold-200"
              }`}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/25 px-2 sm:px-3 py-1">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-extrabold text-brewhas-950">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-gold-200 truncate max-w-[80px]">{name}</span>
          </div>

          <button onClick={handleLogout} className="rounded-full border border-gold-400/40 bg-gold-400/25 p-2 text-gold-300 hover:bg-red-500/30 hover:text-white transition-all" title="Logout">
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="relative z-10 flex flex-wrap gap-1.5 border-b-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-sm px-3 py-2 md:hidden">
        {adminNavLinks.map(link => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              pathname.startsWith(link.href) && link.href !== "/pos" ? "bg-gold-500 text-brewhas-950 shadow-lg shadow-gold-500/25" : "border-2 border-brewhas-700/50 text-gold-300 hover:bg-brewhas-700/50"
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="relative z-10 flex-1 overflow-y-auto [&>div>header]:hidden [&>div>nav.flex-wrap]:hidden">
        {children}
      </div>
    </div>
  )
}
