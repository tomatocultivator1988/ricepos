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
  status: string; balance?: number;
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
    setEditing({ status: "active" })
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
        status: editing.status,
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
          <p className="text-sm text-stone-500">{customers.length} customers</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -transtone-y-1/2 h-4 w-4 text-stone-500" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-gold-100 border-amber-300/60 text-stone-800" />
      </div>

      {loading ? (
        <div className="text-center text-stone-500 py-12">Loading...</div>
      ) : (
        <div className="rounded-lg border border-amber-300/60 bg-gold-200/90 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-300/60 hover:bg-transparent">
                <TableHead className="text-stone-700">Name</TableHead>
                <TableHead className="text-stone-700">Contact</TableHead>
                <TableHead className="text-stone-700 text-right">Balance (Utang)</TableHead>
                <TableHead className="text-stone-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-stone-500 py-8">No customers</TableCell></TableRow>
              ) : customers.map(c => (
                <TableRow key={c.id} className="border-amber-300/60 cursor-pointer hover:bg-white" onClick={() => openDetail(c.id)}>
                  <TableCell className="text-stone-800 font-medium">{c.name}</TableCell>
                  <TableCell className="text-stone-500">{c.contact ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {(c.balance ?? 0) > 0
                      ? <span className="text-amber-600 font-semibold">₱{(c.balance ?? 0).toFixed(2)}</span>
                      : <span className="text-stone-500">₱0.00</span>}
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
        <DialogContent className="max-w-md bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
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
              <div className="grid grid-cols-1 gap-4">
                {editing.id && (
                  <div className="space-y-1.5 mb-1">
                    <label className="text-xs font-medium text-stone-500 mb-1">Status</label>
                    <Select value={editing.status ?? "active"} onValueChange={v => setEditing({ ...editing, status: v ?? "active" })}>
                      <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><SelectValue /></SelectTrigger>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserRoundIcon className="h-5 w-5" /> {detail.customer.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-stone-500">
                    {detail.customer.contact ? `${detail.customer.contact}` : "no contact"}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500">Outstanding Balance</p>
                    <p className={`text-lg font-bold ${detail.balance > 0 ? "text-amber-600" : "text-green-700"}`}>
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
                  <div className="rounded-lg border border-amber-300/60 bg-white p-3 space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-1"><CreditCard className="h-4 w-4" /> Record Payment</p>
                    <Input type="number" step="0.01" placeholder="Amount" value={collectAmount}
                      onChange={e => setCollectAmount(e.target.value)} className="bg-gold-100 border-amber-300/60 h-10" />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={collectMethod} onValueChange={v => setCollectMethod(v ?? "cash")}>
                        <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="gcash">GCash</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={recordCollection} disabled={collecting} className="bg-green-600 hover:bg-emerald-500">
                        {collecting ? "..." : "Record"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Open Sales */}
                <div>
                  <p className="text-sm font-semibold mb-2">Unpaid Sales</p>
                  {detail.openSales.length === 0 ? (
                    <p className="text-xs text-stone-500">No unpaid sales</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.openSales.map((s: any) => (
                        <div key={s.id} className="bg-gold-200 rounded-lg p-3 border border-amber-300/60">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-stone-800">#{String(s.sale_number).padStart(6, "0")}</span>
                            <span className="text-[10px] text-stone-500">{s.daysSince}d ago</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div><span className="block text-stone-500 mb-0.5">Total</span><span className="text-stone-700">₱{Number(s.total).toFixed(2)}</span></div>
                            <div><span className="block text-stone-500 mb-0.5">Paid</span><span className="text-stone-500">₱{Number(s.amount_paid).toFixed(2)}</span></div>
                            <div><span className="block text-stone-500 mb-0.5">Balance</span><span className="text-amber-600">₱{Number(s.balance).toFixed(2)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment History */}
                {detail.collections.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Payment History</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detail.collections.map((c: any) => (
                        <div key={c.id} className="flex justify-between items-center text-xs bg-white rounded px-2 py-1">
                          <span className="text-stone-500">{new Date(c.created_at).toLocaleDateString("en-PH")} · {c.method}{c.is_collection ? " (collection)" : ""}</span>
                          <span className="text-green-700 font-medium">₱{Number(c.amount).toFixed(2)}</span>
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
