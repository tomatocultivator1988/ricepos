"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { User, Lock, LogIn, Loader2, Store, Sparkles } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Login failed")
      }
      const session = await res.json()
      if (session.role === "admin") { router.push("/dashboard") }
      else { router.push("/pos") }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden font-body text-foreground">{/* Background image */}<div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center bg-no-repeat" />{/* Violet overlay */}<div className="absolute inset-0 bg-gradient-to-br from-brewhas-950/85 via-brewhas-900/75 to-brewhas-950/85" />
      <style>{brewhasStyles}</style>

      <div className="relative grid min-h-screen lg:grid-cols-2">

        {/* LEFT — Background Image + Gold Lines */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14">
          
          {/* Gold horizontal lines — 4 static positions */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" style={{ top: '15%' }} />
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" style={{ top: '38%' }} />
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" style={{ top: '62%' }} />
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" style={{ top: '85%' }} />
          </div>

          {/* Large gold orb — static */}
          <div className="pointer-events-none absolute -right-16 top-12 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Store className="size-5 text-gold-400" />
            </div>
            <div className="flex items-center gap-2 text-sm font-medium tracking-widest text-white/80">
              <span className="uppercase">Point of Sale</span>
            </div>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="mb-10 flex justify-center">
              <div className="relative w-72 h-72 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gold-400/20 blur-2xl" />
                <img src="/logo.png" alt="GroceryPOS" className="relative z-10 w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]" />
              </div>
            </div>

            <h1 className="text-center font-display text-5xl font-extrabold leading-[1.05] text-white xl:text-6xl">
              GroceryPOS
            </h1>

            <p className="mx-auto mt-5 max-w-sm text-center text-base leading-relaxed text-white/75">
              A spellbinding coffee house pouring small-batch espresso and hand-crafted lattes. Sign in to run the stand.
            </p>
          </div>

          <div className="relative flex flex-wrap gap-2.5">
            {[
              { icon: Sparkles, label: "Handcrafted Daily" },
              { icon: Store, label: "Est. 2026" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 ring-1 ring-white/20 backdrop-blur">
                <Icon className="size-3.5 text-gold-300" />
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* RIGHT — Gold Elegant Form */}
        <section className="relative flex items-center justify-center px-5 py-12 sm:px-8">
          
          {/* Animated glowing orbs behind form */}
          <div className="pointer-events-none absolute top-1/4 right-1/3 h-40 w-40 rounded-full bg-gold-400/15 blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
          <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-32 w-32 rounded-full bg-gold-300/10 blur-3xl animate-pulse" style={{ animationDuration: '7s', animationDelay: '3s' }} />

          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="bk-rise mb-8 flex flex-col items-center text-center lg:hidden" style={{ animationDelay: "60ms" }}>
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gold-400/20 blur-xl animate-pulse" />
                <img src="/logo.png" alt="Brewhas" className="relative z-10 w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white">GroceryPOS</h1>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400">
                <Sparkles className="size-3.5 text-gold-500 sparkle-icon" />
                Point of Sale
              </p>
            </div>

            {/* Form card — dark translucent with gold border */}
            <form
              onSubmit={handleSubmit}
              className="bk-rise relative rounded-3xl border border-gold-500/30 bg-brewhas-900/60 p-7 shadow-[0_0_60px_-20px_rgba(212,175,55,0.15)] backdrop-blur-xl sm:p-9"
              style={{ animationDelay: "160ms" }}
            >
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-3xl ring-1 ring-gold-400/20 pointer-events-none" />

              <div className="mb-7">
                <h2 className="font-display text-2xl font-bold text-white">Welcome back</h2>
                <p className="mt-1 text-sm text-brewhas-200">Sign in to your stand to continue.</p>
              </div>

              <div className="space-y-5">
                <div className="bk-rise space-y-1.5" style={{ animationDelay: "240ms" }}>
                  <label htmlFor="username" className="text-sm font-medium text-brewhas-200">
                    Username
                  </label>
                  <div className="group relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gold-400 transition-colors duration-200 group-focus-within:text-gold-300" />
                    <Input
                      id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Admin or Cashier" autoComplete="username" required
                      className="h-12 rounded-xl border-gold-500/30 bg-black/30 pl-11 text-white placeholder:text-brewhas-300 text-base transition-all duration-300 focus-visible:border-gold-400 focus-visible:ring-2 focus-visible:ring-gold-500/30 focus-visible:bg-black/50"
                    />
                  </div>
                </div>

                <div className="bk-rise space-y-1.5" style={{ animationDelay: "320ms" }}>
                  <label htmlFor="password" className="text-sm font-medium text-brewhas-200">
                    Password
                  </label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gold-400 transition-colors duration-200 group-focus-within:text-gold-300" />
                    <Input
                      id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password" autoComplete="current-password" required
                      className="h-12 rounded-xl border-gold-500/30 bg-black/30 pl-11 text-white placeholder:text-brewhas-300 text-base transition-all duration-300 focus-visible:border-gold-400 focus-visible:ring-2 focus-visible:ring-gold-500/30 focus-visible:bg-black/50"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit" disabled={loading}
                className="mt-7 h-12 w-full cursor-pointer rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-base font-semibold text-brewhas-950 shadow-lg shadow-gold-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:from-gold-400 hover:to-gold-500 hover:shadow-xl hover:shadow-gold-400/30 active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <><Loader2 className="size-5 animate-spin" /> Signing in...</>
                ) : (
                  <><LogIn className="size-5" /> Sign In</>
                )}
              </Button>
            </form>

            <p className="bk-rise mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-brewhas-400" style={{ animationDelay: "420ms" }}>
              <Store className="size-3.5" />
              GroceryPOS - Point of Sale
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

const brewhasStyles = `
@keyframes bkRise {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
.bk-rise { opacity: 0; animation: bkRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
@media (prefers-reduced-motion: reduce) {
  .bk-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`
