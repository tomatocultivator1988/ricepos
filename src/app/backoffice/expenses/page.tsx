"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "sonner"

const CATEGORIES = ["utilities", "rent", "supplies", "salary", "load", "transport", "other"]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({ date: new Date().toISOString().split("T")[0], category: "utilities", description: "", amount: "" })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/backoffice/expenses")
    const json = await res.json()
    setExpenses(json.expenses ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function save() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter a valid amount"); return }
    setSaving(true)
    const res = await fetch("/api/backoffice/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Save failed"); setSaving(false); return }
    toast.success("Expense recorded")
    setOpen(false); setSaving(false)
    setForm({ date: new Date().toISOString().split("T")[0], category: "utilities", description: "", amount: "" })
    fetchData()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-slate-400">Total: ₱{total.toFixed(2)}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
      </div>

      {loading ? <div className="text-center text-slate-400 py-12">Loading...</div> : (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Category</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-slate-300 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-8">No expenses</TableCell></TableRow> :
                  expenses.map(e => (
                    <TableRow key={e.id} className="border-slate-800">
                      <TableCell className="text-slate-300">{e.date}</TableCell>
                      <TableCell className="text-slate-400 capitalize">{e.category}</TableCell>
                      <TableCell className="text-slate-400">{e.description ?? "—"}</TableCell>
                      <TableCell className="text-right text-orange-400 font-medium">₱{Number(e.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Date</label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Category</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v ?? "utilities" })}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Description</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Amount</label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
