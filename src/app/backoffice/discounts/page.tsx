"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { DiscountsManager } from "@/components/discounts-manager"

export default function DiscountsPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role })
      else { router.push("/auth/login") }
    }).catch(() => { router.push("/auth/login") })
  }, [router])

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-transparent"><Loader2Icon className="h-8 w-8 animate-spin text-primary" /></div>
  )

  return (
    <div className="p-5 space-y-6">
      <h1 className="text-2xl font-bold text-amber-500">Discounts</h1>
      <DiscountsManager />
    </div>
  )
}
