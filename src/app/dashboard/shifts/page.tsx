"use client"

import { ShiftsManager } from "@/components/shifts-manager"

export default function ShiftsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Shift Records</h1>
      <ShiftsManager />
    </div>
  )
}
