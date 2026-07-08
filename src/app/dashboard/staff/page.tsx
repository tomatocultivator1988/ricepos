"use client"

import { useState } from "react"
import { UsersIcon, ClockIcon } from "lucide-react"
import { EmployeesManager } from "@/components/employees-manager"
import { ShiftsManager } from "@/components/shifts-manager"

const STAFF_TABS = [
  { key: "employees", label: "Employees", icon: UsersIcon },
  { key: "shifts", label: "Shifts", icon: ClockIcon },
] as const

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState("employees")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h1 className="text-2xl font-bold text-white">Staff</h1>
        <div className="flex gap-1">
          {STAFF_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === tab.key ? "bg-primary text-white" : "bg-gold-100 text-stone-500 hover:text-white"}`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "employees" && (
        <div className="space-y-6">
          <EmployeesManager />
        </div>
      )}

      {activeTab === "shifts" && (
        <div className="space-y-6">
          <ShiftsManager />
        </div>
      )}
    </div>
  )
}
