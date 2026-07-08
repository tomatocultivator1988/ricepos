"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Search, Pencil, Trash2, Loader2Icon } from "lucide-react"
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

export function TaxRatesManager() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxRate | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<TaxRate | null>(null)

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

  useEffect(() => { fetchTaxRates() }, [fetchTaxRates])

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
    setForm({ name: taxRate.name, rate: taxRate.rate })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (!form.rate || isNaN(Number(form.rate)) || Number(form.rate) < 0) return
    setSaving(true)
    try {
      const body = { name: form.name.trim(), rate: form.rate }
      let res
      if (editingItem) {
        res = await fetch(`/api/backoffice/tax-rates/${editingItem.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/backoffice/tax-rates", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Tax Rates</h2>
        <Button onClick={openCreateDialog} className="rounded-xl bg-primary hover:bg-amber-400 text-primary-foreground">
          <Plus className="size-4" />
          Add Tax Rate
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <Input
          placeholder="Search tax rates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-amber-300/60 bg-gold-100 pl-9"
        />
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border-2 border-amber-300/60 bg-gold-200/90 p-8 text-center text-stone-500 shadow-md">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-amber-300/60 bg-gold-200/90 p-8 text-center text-stone-500 shadow-md">No tax rates found</div>
        ) : (
          filtered.map((tr) => (
            <div key={tr.id} onClick={() => openEditDialog(tr)} className="rounded-2xl border-2 border-amber-300/60 bg-gold-200/90 p-4 shadow-md cursor-pointer hover:border-gold-400/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-stone-800 text-sm">{tr.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-extrabold">{Number(tr.rate).toFixed(2)}%</span>
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
      <div className="hidden md:block rounded-2xl border-2 border-amber-300/60 bg-gold-200/90 shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-transparent hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase text-amber-600">Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-amber-600">Rate (%)</TableHead>
              <TableHead className="w-24 text-xs font-semibold uppercase text-amber-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-stone-500">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-stone-500">No tax rates found</TableCell>
              </TableRow>
            ) : (
              filtered.map((tr) => (
                <TableRow key={tr.id} className="cursor-pointer transition-colors hover:bg-gold-200/50" onClick={() => openEditDialog(tr)}>
                  <TableCell className="font-medium text-stone-800">{tr.name}</TableCell>
                  <TableCell className="font-mono tabular-nums text-stone-700">{Number(tr.rate).toFixed(2)}%</TableCell>
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
        <DialogContent className="rounded-2xl bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="trm-name">Name *</Label>
              <Input id="trm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gold-100" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trm-rate">Rate (%) *</Label>
              <Input id="trm-rate" type="number" step="0.01" min="0" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="e.g. 8" className="bg-gold-100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-2 border-amber-300/60 text-stone-700 font-medium hover:bg-stone-100" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-amber-400 text-primary-foreground">
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          <DialogHeader>
            <DialogTitle>Delete Tax Rate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" className="border-2 border-amber-300/60 text-stone-700 font-medium hover:bg-stone-100" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
