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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Truck className="h-6 w-6 text-amber-600" /> Suppliers</h1>
          <p className="text-sm text-stone-500">{suppliers.length} suppliers</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-primary hover:bg-amber-400"><Plus className="h-4 w-4" /> Add Supplier</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
        <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-gold-100 border-amber-300/60 text-stone-800" />
      </div>

      {loading ? <div className="text-center text-stone-500 py-12">Loading...</div> : suppliers.length === 0 ? (
        <Card className="bg-gold-200/90 border-amber-300/60"><CardContent className="p-6 text-center text-stone-500">No suppliers yet</CardContent></Card>
      ) : (
        <>
        {/* Mobile Cards */}
        <div className="grid grid-cols-1 gap-3 lg:hidden">
          {suppliers.map(s => (
            <div key={s.id} onClick={() => openEdit(s)} className="bg-gold-200 rounded-xl p-4 border border-amber-300/60 space-y-2 cursor-pointer hover:border-amber-400/50">
              <div className="flex justify-between items-start">
                <span className="font-bold text-stone-800 text-sm">{s.name}</span>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
              <div className="text-xs text-stone-500">
                <span>{s.contact ?? "—"}{s.address ? ` · ${s.address}` : ""}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop Table */}
        <div className="hidden lg:block">
        <Card className="bg-gold-200/90 border-amber-300/60">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-300/60 hover:bg-transparent">
                  <TableHead className="text-stone-700">Name</TableHead>
                  <TableHead className="text-stone-700">Contact</TableHead>
                  <TableHead className="text-stone-700">Address</TableHead>
                  <TableHead className="text-stone-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-stone-500 py-8">No suppliers yet</TableCell></TableRow>
                ) : suppliers.map(s => (
                  <TableRow key={s.id} className="border-amber-300/60 cursor-pointer hover:bg-white" onClick={() => openEdit(s)}>
                    <TableCell className="text-stone-800 font-medium">{s.name}</TableCell>
                    <TableCell className="text-stone-500">{s.contact ?? "—"}</TableCell>
                    <TableCell className="text-stone-500">{s.address ?? "—"}</TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5 mb-1">
                <label className="text-xs font-medium text-stone-500 mb-1">Name *</label>
                <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
              </div>
              <div className="space-y-1.5 mb-1">
                <label className="text-xs font-medium text-stone-500 mb-1">Contact</label>
                <Input value={editing.contact ?? ""} onChange={e => setEditing({ ...editing, contact: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
              </div>
              <div className="space-y-1.5 mb-1">
                <label className="text-xs font-medium text-stone-500 mb-1">Address</label>
                <Input value={editing.address ?? ""} onChange={e => setEditing({ ...editing, address: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
              </div>
              <div className="space-y-1.5 mb-1">
                <label className="text-xs font-medium text-stone-500 mb-1">Note</label>
                <Input value={editing.note ?? ""} onChange={e => setEditing({ ...editing, note: e.target.value })} className="bg-gold-100 border-amber-300/60 h-10" />
              </div>
              {editing.id && (
                <div className="space-y-1.5 mb-1">
                  <label className="text-xs font-medium text-stone-500 mb-1">Status</label>
                  <Select value={editing.status ?? "active"} onValueChange={v => setEditing({ ...editing, status: v ?? "active" })}>
                    <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-primary hover:bg-amber-400">{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
