"use client"

import { useState, useEffect } from "react"
import { AdminShell } from "@/components/admin-shell"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name: string } | null>(null)

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser(d.employee)
    }).catch(() => {})
  }, [])

  return <AdminShell name={user?.name || "Admin"}>{children}</AdminShell>
}
