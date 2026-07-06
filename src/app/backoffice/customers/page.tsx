"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Plus, Search, UserRoundIcon, FileTextIcon, CreditCard } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: string; name: string; contact: string | null; address: string | null;
  type: string; status: string; balance?: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Customer> | null>(null)
  const [saving, setSaving] = useState(false)

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [collectAmount, setCollectAmount] = useState("")
  const [collectMethod, setCollectMethod] = useState("cash")
  const [collecting, setCollecting] = useState(false)

  const fetchCustomers = useCallback(async () => {
    const res = await fetch(`/api/backoffice/customers?q=${search}`)
    const json = await res.json()
    setCustomers(json.customers ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  function openNew() {
    setEditing({ type: "retail", status: "active" })
    setDialogOpen(true)
  }

  async function save() {
    if (!editing?.name) { toast.error("Name is required"); return }
    setSaving(true)
    const isNew = !editing.id
    const res = await fetch(isNew ? "/api/backoffice/customers" : `/api/backoffice/customers/${editing.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name, contact: editing.contact, address: editing.address,
        type: editing.type, status: editing.status,
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Save failed"); setSaving(false); return }
    toast.success(isNew ? "Customer created" : "Customer updated")
    setDialogOpen(false); setEditing(null); setSaving(false)
    fetchCustomers()
  }

  async function openDetail(customerId: string) {
    const res = await fetch(`/api/backoffice/customers/${customerId}`)
    const json = await res.json()
    setDetail(json)
    setCollectAmount("")
    setDetailOpen(true)
  }

  async function recordCollection() {
    if (!detail || !collectAmount || Number(collectAmount) <= 0) {
      toast.error("Enter a valid amount"); return
    }
    setCollecting(true)
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: detail.customer.id, amount: Number(collectAmount), method: collectMethod }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Collection failed"); setCollecting(false); return }

    // Try to print collection receipt
    try {
      const { printReceipt } = await import("@/lib/utils/printer")
      await printReceipt({
        header: "COLLECTION RECEIPT",
        subtitle: detail.customer.name,
        items: [{ name: "Utang Payment", qty: 1, price: Number(collectAmount) }],
        subtotal: Number(collectAmount), discount: 0, tax: 0, total: Number(collectAmount),
        paymentMethod: collectMethod,
        amountTendered: Number(collectAmount), change: 0,
        orderNumber: "COL", date: new Date().toLocaleString("en-PH"),
        cashier: "", footer: `New Balance: ₱${json.newBalance.toFixed(2)}`,
      })
    } catch { /* print optional */ }

    toast.success(`Collected ₱${Number(collectAmount).toFixed(2)}. New balance: ₱${json.newBalance.toFixed(2)}`)
    setCollecting(false)
    openDetail(detail.customer.id)
    fetchCustomers()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-slate-400">{customers.length} customers</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-white" />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading...</div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300">Name</TableHead>
                <TableHead className="text-slate-300">Type</TableHead>
                <TableHead className="text-slate-300">Contact</TableHead>
                <TableHead className="text-slate-300 text-right">Balance (Utang)</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No customers</TableCell></TableRow>
              ) : customers.map(c => (
                <TableRow key={c.id} className="border-slate-800 cursor-pointer hover:bg-slate-800/50" onClick={() => openDetail(c.id)}>
                  <TableCell className="text-white font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-slate-400">{c.contact ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {(c.balance ?? 0) > 0
                      ? <span className="text-yellow-400 font-semibold">₱{(c.balance ?? 0).toFixed(2)}</span>
                      : <span className="text-slate-500">₱0.00</span>}
                  </TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Name *</label>
                <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Contact</label>
                <Input value={editing.contact ?? ""} onChange={e => setEditing({ ...editing, contact: e.target.value })} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Address</label>
                <Input value={editing.address ?? ""} onChange={e => setEditing({ ...editing, address: e.target.value })} className="bg-slate-800 border-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Type</label>
                  <Select value={editing.type ?? "retail"} onValueChange={v => setEditing({ ...editing, type: v ?? "retail" })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editing.id && (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Status</label>
                    <Select value={editing.status ?? "active"} onValueChange={v => setEditing({ ...editing, status: v ?? "active" })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null) }}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Detail + Collections */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserRoundIcon className="h-5 w-5" /> {detail.customer.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    {detail.customer.type} · {detail.customer.contact ?? "no contact"}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Outstanding Balance</p>
                    <p className={`text-xl font-bold ${detail.balance > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                      ₱{detail.balance.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a href={`/api/customers/${detail.customer.id}/soa`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1"><FileTextIcon className="h-3 w-3" /> Statement of Account</Button>
                  </a>
                </div>

                {/* Record Collection */}
                {detail.balance > 0 && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-1"><CreditCard className="h-4 w-4" /> Record Payment (Collection)</p>
                    <div className="flex gap-2">
                      <Input type="number" step="0.01" placeholder="Amount" value={collectAmount}
                        onChange={e => setCollectAmount(e.target.value)} className="bg-slate-800 border-slate-700 flex-1" />
                      <Select value={collectMethod} onValueChange={v => setCollectMethod(v ?? "cash")}>
                        <SelectTrigger className="w-28 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="gcash">GCash</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={recordCollection} disabled={collecting} className="bg-emerald-600 hover:bg-emerald-500">
                        {collecting ? "..." : "Record"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Open Sales */}
                <div>
                  <p className="text-sm font-semibold mb-2">Unpaid Sales</p>
                  {detail.openSales.length === 0 ? (
                    <p className="text-xs text-slate-500">No unpaid sales</p>
                  ) : (
                    <div className="rounded border border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700 hover:bg-transparent">
                            <TableHead className="text-slate-400 text-xs">Sale #</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">Total</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">Paid</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">Balance</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">Days</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.openSales.map((s: any) => (
                            <TableRow key={s.id} className="border-slate-800">
                              <TableCell className="text-xs text-white">#{String(s.sale_number).padStart(6, "0")}</TableCell>
                              <TableCell className="text-xs text-right text-slate-300">₱{Number(s.total).toFixed(2)}</TableCell>
                              <TableCell className="text-xs text-right text-slate-400">₱{Number(s.amount_paid).toFixed(2)}</TableCell>
                              <TableCell className="text-xs text-right text-yellow-400">₱{Number(s.balance).toFixed(2)}</TableCell>
                              <TableCell className="text-xs text-right text-slate-500">{s.daysSince}d</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Payment History */}
                {detail.collections.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Payment History</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detail.collections.map((c: any) => (
                        <div key={c.id} className="flex justify-between items-center text-xs bg-slate-800/50 rounded px-2 py-1">
                          <span className="text-slate-400">{new Date(c.created_at).toLocaleDateString("en-PH")} · {c.method}{c.is_collection ? " (collection)" : ""}</span>
                          <span className="text-emerald-400 font-medium">₱{Number(c.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
