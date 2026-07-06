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

type TaxRate = {
  id: string
  storeId: string
  name: string
  rate: string
  createdAt: string
  updatedAt: string
}

const emptyForm = { name: "", rate: "" }

export default function TaxRatesPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxRate | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<TaxRate | null>(null)

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

  const fetchTaxRates = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/tax-rates")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTaxRates(data.taxRates)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTaxRates()
  }, [fetchTaxRates])

  const filtered = taxRates.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  function openCreateDialog() {
    setEditingItem(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(taxRate: TaxRate) {
    setEditingItem(taxRate)
    setForm({
      name: taxRate.name,
      rate: taxRate.rate,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (!form.rate || isNaN(Number(form.rate)) || Number(form.rate) < 0) return

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        rate: form.rate,
      }

      let res
      if (editingItem) {
        res = await fetch(`/api/backoffice/tax-rates/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/backoffice/tax-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) throw new Error("Failed to save")

      setDialogOpen(false)
      fetchTaxRates()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save tax rate")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(taxRate: TaxRate) {
    setSaving(true)
    try {
      const res = await fetch(`/api/backoffice/tax-rates/${taxRate.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      fetchTaxRates()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete tax rate")
    } finally {
      setSaving(false)
    }
  }

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
            <h1 className="text-2xl font-bold text-gold-300">Tax Rates</h1>
            <Button onClick={openCreateDialog} className="rounded-xl bg-brewhas-700 hover:bg-brewhas-800 text-white">
              <Plus className="size-4" />
              Add Tax Rate
            </Button>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -transtone-y-1/2 text-stone-400" />
            <Input
              placeholder="Search tax rates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl pl-9"
            />
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {loading ? (
              <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-stone-400 shadow-md">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-stone-400 shadow-md">No tax rates found</div>
            ) : (
              filtered.map((tr) => (
                <div key={tr.id} onClick={() => openEditDialog(tr)} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md cursor-pointer hover:border-gold-400/50">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gold-200 text-sm">{tr.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gold-200 font-extrabold">{Number(tr.rate).toFixed(2)}%</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEditDialog(tr)} className="rounded-full p-1.5 hover:bg-gold-400/20"><Pencil className="size-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(tr)} className="rounded-full p-1.5 hover:bg-red-50 text-red-500"><Trash2 className="size-3.5" /></button>
                      </div>
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
                  <TableHead className="text-xs font-semibold uppercase text-gold-300">Rate (%)</TableHead>
                  <TableHead className="w-24 text-xs font-semibold uppercase text-gold-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-stone-400">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-stone-400">
                      No tax rates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tr) => (
                    <TableRow
                      key={tr.id}
                      className="cursor-pointer transition-colors hover:bg-transparent/50"
                      onClick={() => openEditDialog(tr)}
                    >
                      <TableCell className="font-medium text-green-900">{tr.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">{Number(tr.rate).toFixed(2)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" className="rounded-full hover:bg-gold-400/20" onClick={() => openEditDialog(tr)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="rounded-full text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(tr)}>
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
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rate">Rate (%) *</Label>
                  <Input id="rate" type="number" step="0.01" min="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="e.g. 8" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-gold-300 font-medium hover:bg-stone-100" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-brewhas-700 hover:bg-brewhas-800 text-white">
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle>Delete Tax Rate</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-stone-400">
                Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-gold-300 font-medium hover:bg-stone-100" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
                  {saving ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
