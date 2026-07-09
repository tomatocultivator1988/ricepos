"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type Category = {
  id: string
  name: string
}

export function ExpenseCategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/expense-categories")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setCategories(data.categories ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const filtered = categories.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  function openCreateDialog() {
    setEditingItem(null)
    setName("")
    setDialogOpen(true)
  }

  function openEditDialog(cat: Category) {
    setEditingItem(cat)
    setName(cat.name)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const body = { name: name.trim() }
      let res
      if (editingItem) {
        res = await fetch(`/api/backoffice/expense-categories/${editingItem.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/backoffice/expense-categories", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
      }
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      fetchCategories()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    setSaving(true)
    try {
      const res = await fetch(`/api/backoffice/expense-categories/${cat.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      fetchCategories()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete category")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Expense Categories</h2>
        <Button onClick={openCreateDialog} className="rounded-xl bg-primary hover:bg-amber-400 text-primary-foreground">
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <Input
          placeholder="Search categories..."
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
          <div className="rounded-2xl border-2 border-amber-300/60 bg-gold-200/90 p-8 text-center text-stone-500 shadow-md">No categories found</div>
        ) : (
          filtered.map((cat) => (
            <div key={cat.id} onClick={() => openEditDialog(cat)} className="rounded-2xl border-2 border-amber-300/60 bg-gold-200/90 p-4 shadow-md cursor-pointer hover:border-gold-400/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-stone-800 text-sm capitalize">{cat.name}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEditDialog(cat)} className="rounded-full p-1.5 hover:bg-gold-400/20"><Pencil className="size-3.5" /></button>
                  <button onClick={() => setDeleteConfirm(cat)} className="rounded-full p-1.5 hover:bg-red-50 text-red-500"><Trash2 className="size-3.5" /></button>
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
              <TableHead className="w-24 text-xs font-semibold uppercase text-amber-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-stone-500">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-stone-500">No categories found</TableCell>
              </TableRow>
            ) : (
              filtered.map((cat) => (
                <TableRow key={cat.id} className="cursor-pointer transition-colors hover:bg-gold-200/50" onClick={() => openEditDialog(cat)}>
                  <TableCell className="font-medium text-stone-800 capitalize">{cat.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" className="rounded-full hover:bg-gold-400/20" onClick={() => openEditDialog(cat)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="rounded-full text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(cat)}>
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
            <DialogTitle>{editingItem ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ecm-name">Name *</Label>
              <Input id="ecm-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-gold-100" />
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
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? Expenses using this category will still exist.
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
