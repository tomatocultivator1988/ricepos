"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

const FALLBACK_CATEGORIES = ["utilities", "rent", "supplies", "salary", "load", "transport", "other"]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [form, setForm] = useState<any>({ date: new Date().toISOString().split("T")[0], category: "utilities", description: "", amount: "" })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  const fetchData = useCallback(async () => {
    const [expRes, catRes] = await Promise.all([
      fetch("/api/backoffice/expenses"),
      fetch("/api/backoffice/expense-categories"),
    ])
    const expJson = await expRes.json()
    setExpenses(expJson.expenses ?? [])

    const catJson = await catRes.json()
    const cats = catJson.categories ?? []
    if (cats.length > 0 && cats[0].name) {
      setCategories(cats.map((c: any) => c.name))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openNew() {
    setEditingExpense(null)
    setForm({ date: new Date().toISOString().split("T")[0], category: categories[0] || "utilities", description: "", amount: "" })
    setOpen(true)
  }

  function openEdit(e: any) {
    setEditingExpense(e)
    setForm({ date: e.date, category: categories.includes(e.category) ? e.category : categories[0] || "utilities", description: e.description ?? "", amount: String(e.amount) })
    setOpen(true)
  }

  async function save() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter a valid amount"); return }
    setSaving(true)
    const isNew = !editingExpense
    const url = isNew ? "/api/backoffice/expenses" : `/api/backoffice/expenses/${editingExpense.id}`
    const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Save failed"); setSaving(false); return }
    toast.success(isNew ? "Expense recorded" : "Expense updated")
    setOpen(false); setSaving(false); fetchData()
  }

  async function handleDelete(expense: any) {
    setSaving(true)
    try {
      const res = await fetch(`/api/backoffice/expenses/${expense.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      toast.success("Expense deleted")
      fetchData()
    } catch {
      toast.error("Failed to delete expense")
    } finally {
      setSaving(false)
    }
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-stone-500">Total: ₱{total.toFixed(2)}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
      </div>

      {loading ? <div className="text-center text-stone-500 py-12">Loading...</div> : expenses.length === 0 ? (
        <Card className="bg-gold-200/90 border-amber-300/60"><CardContent className="p-6 text-center text-stone-500">No expenses</CardContent></Card>
      ) : (
        <>
        {/* Mobile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:hidden">
          {expenses.map(e => (
            <div key={e.id} className="bg-gold-200 rounded-xl p-4 border border-amber-300/60 space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-stone-800 text-sm capitalize">{e.category}</span>
                <span className="text-orange-400 font-bold">₱{Number(e.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-stone-500">
                <span>{e.date}{e.description ? ` · ${e.description}` : ""}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(e)} className="rounded-full p-1.5 hover:bg-gold-400/20"><Pencil className="size-3.5" /></button>
                  <button onClick={() => setDeleteConfirm(e)} className="rounded-full p-1.5 hover:bg-red-50 text-red-500"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block">
        <Card className="bg-gold-200/90 border-amber-300/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-300/60 hover:bg-transparent">
                  <TableHead className="text-stone-700">Date</TableHead>
                  <TableHead className="text-stone-700">Category</TableHead>
                  <TableHead className="text-stone-700">Description</TableHead>
                  <TableHead className="text-stone-700 text-right">Amount</TableHead>
                  <TableHead className="text-stone-700 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-stone-500 py-8">No expenses</TableCell></TableRow> :
                  expenses.map(e => (
                    <TableRow key={e.id} className="border-amber-300/60">
                      <TableCell className="text-stone-700">{e.date}</TableCell>
                      <TableCell className="text-stone-500 capitalize">{e.category}</TableCell>
                      <TableCell className="text-stone-500">{e.description ?? "—"}</TableCell>
                      <TableCell className="text-right text-orange-400 font-medium">₱{Number(e.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          <DialogHeader><DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5 mb-1">
              <label className="text-xs font-medium text-stone-500 mb-1">Date</label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
            </div>
            <div className="space-y-1.5 mb-1">
              <label className="text-xs font-medium text-stone-500 mb-1">Category</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v ?? categories[0] })}>
                <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 mb-1">
              <label className="text-xs font-medium text-stone-500 mb-1">Description</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
            </div>
            <div className="space-y-1.5 mb-1">
              <label className="text-xs font-medium text-stone-500 mb-1">Amount</label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : editingExpense ? "Update" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          <DialogHeader><DialogTitle>Delete Expense</DialogTitle></DialogHeader>
          <p className="text-sm text-stone-500">
            Are you sure you want to delete this <strong>{deleteConfirm?.category}</strong> expense of <strong>₱{Number(deleteConfirm?.amount).toFixed(2)}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
