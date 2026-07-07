"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Truck } from "lucide-react"
import { toast } from "sonner"

interface Supplier {
  id: string; name: string; contact: string | null; address: string | null;
  note: string | null; status: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/backoffice/suppliers?includeInactive=true&q=${search}`)
    const json = await res.json()
    setSuppliers(json.suppliers ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  function openNew() { setEditing({ status: "active" }); setOpen(true) }
  function openEdit(s: Supplier) { setEditing({ ...s }); setOpen(true) }

  async function save() {
    if (!editing?.name) { toast.error("Name is required"); return }
    setSaving(true)
    const isNew = !editing.id
    const res = await fetch(isNew ? "/api/backoffice/suppliers" : `/api/backoffice/suppliers/${editing.id}`, {
      method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, contact: editing.contact, address: editing.address, note: editing.note, status: editing.status }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Save failed"); setSaving(false); return }
    toast.success(isNew ? "Supplier added" : "Supplier updated")
    setOpen(false); setEditing(null); setSaving(false); fetchData()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Truck className="h-6 w-6 text-amber-400" /> Suppliers</h1>
          <p className="text-sm text-stone-400">{suppliers.length} suppliers</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-amber-600 hover:bg-amber-500"><Plus className="h-4 w-4" /> Add Supplier</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-stone-800 border-amber-600/30 text-white" />
      </div>

      {loading ? <div className="text-center text-stone-400 py-12">Loading...</div> : (
        <Card className="bg-stone-900/60 border-amber-600/30">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-600/30 hover:bg-transparent">
                  <TableHead className="text-stone-300">Name</TableHead>
                  <TableHead className="text-stone-300">Contact</TableHead>
                  <TableHead className="text-stone-300">Address</TableHead>
                  <TableHead className="text-stone-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-stone-500 py-8">No suppliers yet</TableCell></TableRow>
                ) : suppliers.map(s => (
                  <TableRow key={s.id} className="border-amber-600/30 cursor-pointer hover:bg-stone-800/50" onClick={() => openEdit(s)}>
                    <TableCell className="text-white font-medium">{s.name}</TableCell>
                    <TableCell className="text-stone-400">{s.contact ?? "—"}</TableCell>
                    <TableCell className="text-stone-400">{s.address ?? "—"}</TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-stone-900 border-amber-600/30 text-white">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Name *</label>
                <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="bg-stone-800 border-amber-600/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Contact</label>
                <Input value={editing.contact ?? ""} onChange={e => setEditing({ ...editing, contact: e.target.value })} className="bg-stone-800 border-amber-600/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Address</label>
                <Input value={editing.address ?? ""} onChange={e => setEditing({ ...editing, address: e.target.value })} className="bg-stone-800 border-amber-600/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Note</label>
                <Input value={editing.note ?? ""} onChange={e => setEditing({ ...editing, note: e.target.value })} className="bg-stone-800 border-amber-600/30" />
              </div>
              {editing.id && (
                <div className="space-y-1">
                  <label className="text-xs text-stone-400">Status</label>
                  <Select value={editing.status ?? "active"} onValueChange={v => setEditing({ ...editing, status: v ?? "active" })}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/30"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-amber-600 hover:bg-amber-500">{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
