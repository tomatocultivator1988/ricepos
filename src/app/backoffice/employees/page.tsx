"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Plus, Search, Pencil, Trash2, StoreIcon, LayoutDashboardIcon, PackageIcon, BoxesIcon, UsersIcon, LogOutIcon, Loader2Icon , TrendingUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Employee = {
  id: string
  store_id: string
  user_id: string | null
  name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const emptyForm = { name: "", role: "", pin: "" }

export default function EmployeesPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role })
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/employees")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setEmployees(data.employees ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  function openCreateDialog() {
    setEditingEmployee(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(employee: Employee) {
    setEditingEmployee(employee)
    setForm({
      name: employee.name,
      role: employee.role,
      pin: "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (!form.role) return
    if (!editingEmployee && (!form.pin || !/^\d{4}$/.test(form.pin))) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role,
      }
      if (editingEmployee) {
        if (form.pin && /^\d{4}$/.test(form.pin)) {
          body.pin = form.pin
        }
      } else {
        body.pin = form.pin
      }

      let res
      if (editingEmployee) {
        res = await fetch(`/api/backoffice/employees/${editingEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/backoffice/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) throw new Error("Failed to save")

      setDialogOpen(false)
      fetchEmployees()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save employee")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(employee: Employee) {
    setSaving(true)
    try {
      const res = await fetch(`/api/backoffice/employees/${employee.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      fetchEmployees()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete employee")
    } finally {
      setSaving(false)
    }
  }

  const filtered = employees.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  )

  const navLinks = [
    { label: "POS", href: "/pos", icon: StoreIcon },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { label: "Sales", href: "/dashboard/sales", icon: TrendingUpIcon },
    { label: "Items", href: "/backoffice/items", icon: PackageIcon },
    { label: "Inventory", href: "/backoffice/inventory", icon: BoxesIcon },
    { label: "Employees", href: "/backoffice/employees", icon: UsersIcon },
  ]

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-transparent"><Loader2Icon className="h-8 w-8 animate-spin text-gold-300" /></div>
  )

  return (
    <div className="flex h-screen flex-col bg-transparent">


      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gold-300">Employees</h1>
            <Button onClick={openCreateDialog} className="rounded-xl bg-brewhas-700 hover:bg-brewhas-800 text-white">
              <Plus className="size-4" />
              Add Employee
            </Button>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl pl-9"
            />
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {loading ? (
              <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-slate-400 shadow-md">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-slate-400 shadow-md">No employees found</div>
            ) : (
              filtered.map((employee) => (
                <div key={employee.id} onClick={() => openEditDialog(employee)} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md cursor-pointer hover:border-gold-400/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gold-200 text-sm">{employee.name}</span>
                    <span className="capitalize text-xs text-slate-400">{employee.role}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={employee.is_active ? 'text-gold-300 font-semibold' : 'text-slate-400'}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditDialog(employee)} className="rounded-full p-1.5 hover:bg-gold-400/20"><Pencil className="size-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(employee)} className="rounded-full p-1.5 hover:bg-red-50 text-red-500"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-transparent hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-gold-300">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gold-300">Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gold-300">Status</TableHead>
                  <TableHead className="w-24 text-xs font-semibold uppercase text-gold-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((employee) => (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer transition-colors hover:bg-transparent/50"
                      onClick={() => openEditDialog(employee)}
                    >
                      <TableCell className="font-medium text-green-900">{employee.name}</TableCell>
                      <TableCell className="capitalize">{employee.role}</TableCell>
                      <TableCell>
                        {employee.is_active ? (
                          <span className="inline-flex h-5 w-fit items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium bg-gold-400/20 text-gold-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-fit items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-400">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" className="rounded-full hover:bg-gold-400/20" onClick={() => openEditDialog(employee)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="rounded-full text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(employee)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "" })}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pin">
                    PIN {editingEmployee ? "(leave blank to keep existing)" : " *"}
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d{4}"
                    placeholder="4-digit PIN"
                    value={form.pin}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4)
                      setForm({ ...form, pin: v })
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-gold-300 font-medium hover:bg-slate-100" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-brewhas-700 hover:bg-brewhas-800 text-white">
                  {saving ? "Saving..." : editingEmployee ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle>Deactivate Employee</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-400">
                Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>? This employee will no longer be able to access the POS.
              </p>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-gold-300 font-medium hover:bg-slate-100" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
                  {saving ? "Deleting..." : "Deactivate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
