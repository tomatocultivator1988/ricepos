"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Search, Pencil, Trash2, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Discount = {
  id: string
  store_id: string
  name: string
  type: string
  value: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const emptyForm = { name: "", type: "percentage", value: "" }

export default function DiscountsPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Discount | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Discount | null>(null)

  const router = useRouter()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role })
      else { router.push("/auth/login") }
    }).catch(() => { router.push("/auth/login") })
  }, [router])

  const fetchDiscounts = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/discounts")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDiscounts(data.discounts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  const filtered = discounts.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  )

  function openCreateDialog() {
    setEditingItem(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(discount: Discount) {
    setEditingItem(discount)
    setForm({
      name: discount.name,
      type: discount.type,
      value: discount.value,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) < 0) return

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        value: form.value,
      }

      let res
      if (editingItem) {
        res = await fetch(`/api/backoffice/discounts/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/backoffice/discounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) throw new Error("Failed to save")

      setDialogOpen(false)
      fetchDiscounts()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save discount")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(discount: Discount) {
    setSaving(true)
    try {
      const res = await fetch(`/api/backoffice/discounts/${discount.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      fetchDiscounts()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete discount")
    } finally {
      setSaving(false)
    }
  }

  function formatValue(discount: Discount) {
    if (discount.type === "percentage") return `${discount.value}%`
    return `P${Number(discount.value).toFixed(2)}`
  }

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-transparent"><Loader2Icon className="h-8 w-8 animate-spin text-primary" /></div>
  )

  return (
    <div className="flex h-screen flex-col bg-transparent">


      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Discounts</h1>
            <Button onClick={openCreateDialog} className="rounded-xl bg-primary hover:bg-amber-400 text-primary-foreground">
              <Plus className="size-4" />
              Add Discount
            </Button>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              placeholder="Search discounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl pl-9"
            />
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {loading ? (
              <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-stone-500 shadow-md">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-stone-500 shadow-md">No discounts found</div>
            ) : (
              filtered.map((discount) => (
                <div key={discount.id} onClick={() => openEditDialog(discount)} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md cursor-pointer hover:border-gold-400/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gold-200 text-sm">{discount.name}</span>
                    <span className="text-gold-200 font-extrabold">{formatValue(discount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="capitalize text-stone-500">{discount.type} Â· {discount.is_active ? 'Active' : 'Inactive'}</span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditDialog(discount)} className="rounded-full p-1.5 hover:bg-gold-400/20"><Pencil className="size-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(discount)} className="rounded-full p-1.5 hover:bg-red-50 text-red-500"><Trash2 className="size-3.5" /></button>
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
                  <TableHead className="text-xs font-semibold uppercase text-primary">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-primary">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-primary">Value</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-primary">Status</TableHead>
                  <TableHead className="w-24 text-xs font-semibold uppercase text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-stone-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-stone-500">
                      No discounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((discount) => (
                    <TableRow
                      key={discount.id}
                      className="cursor-pointer transition-colors hover:bg-transparent/50"
                      onClick={() => openEditDialog(discount)}
                    >
                      <TableCell className="font-medium text-green-900">{discount.name}</TableCell>
                      <TableCell className="capitalize">{discount.type}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatValue(discount)}</TableCell>
                      <TableCell>
                        {discount.is_active ? (
                          <span className="inline-flex h-5 w-fit items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium bg-gold-400/20 text-gold-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-fit items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium bg-stone-100 text-stone-500">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" className="rounded-full hover:bg-gold-400/20" onClick={() => openEditDialog(discount)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="rounded-full text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(discount)}>
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
            <DialogContent className="rounded-2xl bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Discount" : "Add Discount"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gold-100" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "percentage" })}>
                      <SelectTrigger id="type" className="bg-gold-100">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value">Value *</Label>
                    <Input id="value" type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="bg-gold-100" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-primary font-medium hover:bg-stone-100" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-brewhas-700 hover:bg-brewhas-800 text-stone-800">
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
            <DialogContent className="sm:max-w-sm rounded-2xl bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
              <DialogHeader>
                <DialogTitle>Delete Discount</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-stone-500">
                Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?
              </p>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-primary font-medium hover:bg-stone-100" onClick={() => setDeleteConfirm(null)}>
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
