"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, PackageCheck, ClipboardList, X, Undo2 } from "lucide-react"
import { toast } from "sonner"

interface POListItem {
  id: string; po_number: string; supplier_name: string; status: string;
  order_date: string; expected_date: string | null; total_cost: number;
  line_count: number; pct_received: number;
}
interface Supplier { id: string; name: string }
interface Product { id: string; name: string; sell_by: string; cost: number }

const STATUS_COLORS: Record<string, string> = {
  ordered: "bg-blue-600", partial: "bg-gold-200 text-amber-700", received: "bg-green-600", cancelled: "bg-stone-600",
}

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<POListItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [cSupplier, setCSupplier] = useState("")
  const [cExpected, setCExpected] = useState("")
  const [cNote, setCNote] = useState("")
  const [cLines, setCLines] = useState<{ item_id: string; qty_ordered: string; unit_cost: string }[]>([{ item_id: "", qty_ordered: "", unit_cost: "" }])
  const [saving, setSaving] = useState(false)

  // Detail / receive
  const [detail, setDetail] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [recvLines, setRecvLines] = useState<Record<string, { qty: string; updateCost: boolean }>>({})
  const [receiving, setReceiving] = useState(false)

  // Return to supplier
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnLines, setReturnLines] = useState<Record<string, string>>({})
  const [returnReason, setReturnReason] = useState("")
  const [returnSaving, setReturnSaving] = useState(false)

  const fetchPOs = useCallback(async () => {
    const res = await fetch(`/api/backoffice/purchase-orders?status=${filterStatus}`)
    const json = await res.json()
    setPos(json.purchaseOrders ?? [])
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { fetchPOs() }, [fetchPOs])
  useEffect(() => {
    fetch("/api/backoffice/suppliers").then(r => r.json()).then(d => setSuppliers(d.suppliers ?? []))
    fetch("/api/backoffice/items").then(r => r.json()).then(d => setProducts(d.items ?? []))
  }, [])

  // ── Create ──
  function addLine() { setCLines([...cLines, { item_id: "", qty_ordered: "", unit_cost: "" }]) }
  function removeLine(i: number) { setCLines(cLines.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: string, val: string) {
    const next = [...cLines]; (next[i] as any)[field] = val
    // auto-fill cost from product's current cost when product picked
    if (field === "item_id") {
      const p = products.find(x => x.id === val)
      if (p && !next[i].unit_cost) next[i].unit_cost = String(p.cost)
    }
    setCLines(next)
  }
  const createTotal = cLines.reduce((s, l) => s + (Number(l.qty_ordered || 0) * Number(l.unit_cost || 0)), 0)

  async function createPO() {
    if (!cSupplier) { toast.error("Select a supplier"); return }
    const validLines = cLines.filter(l => l.item_id && Number(l.qty_ordered) > 0)
    if (validLines.length === 0) { toast.error("Add at least one product with quantity"); return }
    setSaving(true)
    const res = await fetch("/api/backoffice/purchase-orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: cSupplier, expected_date: cExpected || null, note: cNote,
        lines: validLines.map(l => ({ item_id: l.item_id, qty_ordered: Number(l.qty_ordered), unit_cost: Number(l.unit_cost || 0) })),
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Failed"); setSaving(false); return }
    toast.success(`Created ${json.purchaseOrder.po_number}`)
    setCreateOpen(false); setSaving(false)
    setCSupplier(""); setCExpected(""); setCNote(""); setCLines([{ item_id: "", qty_ordered: "", unit_cost: "" }])
    fetchPOs()
  }

  // ── Detail / Receive ──
  async function openDetail(poId: string) {
    const res = await fetch(`/api/backoffice/purchase-orders/${poId}`)
    const json = await res.json()
    setDetail(json.purchaseOrder)
    // Pre-fill receive with remaining qty
    const init: Record<string, { qty: string; updateCost: boolean }> = {}
    for (const it of json.purchaseOrder.items) {
      init[it.id] = { qty: String(it.remaining > 0 ? it.remaining : 0), updateCost: false }
    }
    setRecvLines(init)
    setDetailOpen(true)
  }

  async function receive() {
    if (!detail) return
    const lines = Object.entries(recvLines)
      .filter(([_, v]) => Number(v.qty) > 0)
      .map(([line_id, v]) => ({ line_id, receive_qty: Number(v.qty), update_cost: v.updateCost }))
    if (lines.length === 0) { toast.error("Enter quantities to receive"); return }
    setReceiving(true)
    const res = await fetch(`/api/backoffice/purchase-orders/${detail.id}/receive`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Receive failed"); setReceiving(false); return }
    toast.success(`Received into stock. PO is now ${json.purchaseOrder.status}.`)
    setReceiving(false); setDetailOpen(false); fetchPOs()
  }

  async function cancelPO() {
    if (!detail) return
    if (!confirm(`Cancel ${detail.po_number}? Received stock stays; only the remaining balance is voided.`)) return
    const res = await fetch(`/api/backoffice/purchase-orders/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Cancel failed"); return }
    toast.success("PO cancelled"); setDetailOpen(false); fetchPOs()
  }

  const canReceive = detail && (detail.status === "ordered" || detail.status === "partial")
  const canReturn = detail && (detail.status === "received" || detail.status === "partial")

  function openReturn() {
    if (!detail) return
    const init: Record<string, string> = {}
    for (const it of detail.items) {
      if (Number(it.qty_received) > 0) init[it.id] = ""
    }
    setReturnLines(init)
    setReturnReason("")
    setReturnOpen(true)
  }

  async function submitReturn() {
    if (!detail) return
    const lines = Object.entries(returnLines)
      .filter(([_, v]) => Number(v) > 0)
      .map(([poi_id, v]) => ({ poi_id, qty_returned: Number(v) }))
    if (lines.length === 0) { toast.error("Enter quantities to return"); return }
    setReturnSaving(true)
    const res = await fetch(`/api/backoffice/purchase-orders/${detail.id}/return`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: returnReason || null, lines }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Return failed"); setReturnSaving(false); return }
    toast.success(`Returned to supplier (${json.return?.return_number ?? ""}).`)
    setReturnSaving(false); setReturnOpen(false); setDetailOpen(false); fetchPOs()
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-amber-600" /> Purchase Orders</h1>
          <p className="text-sm text-stone-500">{pos.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-36 bg-gold-100 border-amber-300/60 text-stone-800"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-primary hover:bg-amber-400"><Plus className="h-4 w-4" /> New PO</Button>
        </div>
      </div>

      {loading ? <div className="text-center text-stone-500 py-12">Loading...</div> : (
        <Card className="bg-gold-200/90 border-amber-300/60">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-300/60 hover:bg-transparent">
                  <TableHead className="text-stone-700">PO #</TableHead>
                  <TableHead className="text-stone-700">Supplier</TableHead>
                  <TableHead className="text-stone-700">Order Date</TableHead>
                  <TableHead className="text-stone-700">Expected</TableHead>
                  <TableHead className="text-stone-700 text-right">Purchase</TableHead>
                  <TableHead className="text-stone-700 text-center">Received</TableHead>
                  <TableHead className="text-stone-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-stone-500 py-8">No purchase orders</TableCell></TableRow>
                ) : pos.map(p => (
                  <TableRow key={p.id} className="border-amber-300/60 cursor-pointer hover:bg-white" onClick={() => openDetail(p.id)}>
                    <TableCell className="text-stone-800 font-medium">{p.po_number}</TableCell>
                    <TableCell className="text-stone-700">{p.supplier_name}</TableCell>
                    <TableCell className="text-stone-500">{p.order_date}</TableCell>
                    <TableCell className="text-stone-500">{p.expected_date ?? "—"}</TableCell>
                    <TableCell className="text-right text-stone-700">₱{Number(p.total_cost).toFixed(2)}</TableCell>
                    <TableCell className="text-center text-stone-500">{p.pct_received}%</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[p.status]}>{p.status.toUpperCase()}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── CREATE PO DIALOG ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gold-200/80 backdrop-blur-md border-amber-300/60 text-stone-800 p-6">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-500">Supplier *</label>
                <Select value={cSupplier} onValueChange={v => setCSupplier(v ?? "")}>
                  <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><span className="text-stone-800">{suppliers.find(s => s.id === cSupplier)?.name || "Select supplier"}</span></SelectTrigger>
                  <SelectContent><SelectItem value="">None</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-500">Expected Date</label>
                <Input type="date" value={cExpected} onChange={e => setCExpected(e.target.value)} className="bg-gold-100 border-amber-300/60 h-10" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-amber-600">Order Items</label>
                <Button variant="outline" size="sm" onClick={addLine} className="text-xs gap-1"><Plus className="h-3 w-3" /> Add</Button>
              </div>
              <div className="space-y-3">
                {cLines.map((l, i) => (
                  <div key={i} className="bg-gold-200 rounded-lg p-4 border border-amber-300/60 space-y-3">
                    <Select value={l.item_id} onValueChange={v => updateLine(i, "item_id", v ?? "")}>
                      <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10 text-sm">
                        {products.find(p => p.id === l.item_id)?.name || <SelectValue placeholder="Select product" />}
                      </SelectTrigger>
                      <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-stone-500">Qty</span>
                        <Input type="number" step="0.001" value={l.qty_ordered} onChange={e => updateLine(i, "qty_ordered", e.target.value)} className="bg-gold-100 border-amber-300/60 h-9 text-sm" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-stone-500">Buy Cost</span>
                        <Input type="number" step="0.01" value={l.unit_cost} onChange={e => updateLine(i, "unit_cost", e.target.value)} className="bg-gold-100 border-amber-300/60 h-9 text-sm" />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-sm text-stone-700 pb-2">₱{(Number(l.qty_ordered || 0) * Number(l.unit_cost || 0)).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-300 mb-1" onClick={() => removeLine(i)} disabled={cLines.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Input placeholder="Note (optional)" value={cNote} onChange={e => setCNote(e.target.value)} className="bg-gold-100 border-amber-300/60 h-10" />

            <div className="flex justify-between items-center border-t border-amber-300/60 pt-3">
              <span className="text-sm text-stone-500">Total Purchase Cost</span>
              <span className="text-lg font-bold text-white">₱{createTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createPO} disabled={saving} className="bg-primary hover:bg-amber-400">{saving ? "Creating..." : "Create PO"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL / RECEIVE DIALOG ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gold-200/80 backdrop-blur-md border-amber-300/60 text-stone-800 p-6">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {detail.po_number}
                  <Badge className={STATUS_COLORS[detail.status]}>{detail.status.toUpperCase()}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-stone-500">
                  {detail.supplier_name} · Ordered {detail.order_date}{detail.expected_date ? ` · Expected ${detail.expected_date}` : ""}
                </div>
                <div className="space-y-2">
                  {detail.items.map((it: any) => (
                    <div key={it.id} className="bg-gold-200 rounded-lg p-3 border border-amber-300/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-stone-800">{it.item_name}</span>
                        <span className="text-xs text-stone-500">Remaining: {Number(it.remaining)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs mb-2">
                        <div><span className="block text-stone-500 mb-1">Ordered</span><span className="text-stone-800">{Number(it.qty_ordered)}</span></div>
                        <div><span className="block text-stone-500 mb-1">Received</span><span className="text-stone-500">{Number(it.qty_received)}</span></div>
                        <div><span className="block text-stone-500 mb-1">Buy Cost</span><span className="text-stone-500">₱{Number(it.unit_cost).toFixed(2)}</span></div>
                        <div><span className="block text-stone-500 mb-1">Subtotal</span><span className="text-stone-700">₱{(Number(it.qty_ordered) * Number(it.unit_cost)).toFixed(2)}</span></div>
                      </div>
                      {canReceive && it.remaining > 0 && (
                        <div className="flex items-center gap-3 pt-2 border-t border-amber-200/50">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-[10px] text-stone-500">Receive:</span>
                            <Input type="number" step="0.001" min="0" max={it.remaining}
                              value={recvLines[it.id]?.qty ?? ""}
                              onChange={e => setRecvLines({ ...recvLines, [it.id]: { ...recvLines[it.id], qty: e.target.value } })}
                              className="w-20 h-9 bg-gold-100 border-amber-300/60 text-center text-xs" />
                          </div>
                          <label className="flex items-center gap-1.5 text-[10px] text-stone-500 cursor-pointer">
                            <input type="checkbox" checked={recvLines[it.id]?.updateCost ?? false}
                              onChange={e => setRecvLines({ ...recvLines, [it.id]: { ...recvLines[it.id], updateCost: e.target.checked } })}
                              className="accent-amber-500" />
                            Sync cost
                          </label>
                        </div>
                      )}
                      {canReceive && it.remaining <= 0 && (
                        <div className="text-center text-[10px] text-green-400 pt-1">✓ Fully received</div>
                      )}
                    </div>
                  ))}
                </div>

                {canReceive && (
                  <p className="text-[11px] text-stone-500">
                    Tick "Sync cost" to update the product's cost (what you paid the supplier).
                    This affects <strong>profit</strong> on future sales. Leave unchecked to keep current cost.
                    <strong>Selling prices</strong> are never changed.
                  </p>
                )}

                <div className="flex justify-between items-center border-t border-amber-300/60 pt-3">
                  <span className="text-sm text-stone-500">Total Purchase Cost</span>
                  <span className="text-lg font-bold text-white">₱{Number(detail.total_cost).toFixed(2)}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <div className="flex gap-2">
                    {canReceive && (
                      <Button variant="outline" onClick={cancelPO} className="text-red-600 border-red-500/40 hover:bg-red-500/10">Cancel PO</Button>
                    )}
                    {canReturn && (
                      <Button variant="outline" onClick={openReturn} className="text-amber-700 border-amber-500/40 hover:bg-amber-500/10 gap-1"><Undo2 className="h-4 w-4" /> Return to Supplier</Button>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                    {canReceive && (
                      <Button onClick={receive} disabled={receiving} className="bg-green-600 hover:bg-green-500 gap-1">
                        <PackageCheck className="h-4 w-4" /> {receiving ? "Receiving..." : "Receive into Stock"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── RETURN TO SUPPLIER DIALOG ── */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gold-200/80 backdrop-blur-md border-amber-300/60 text-stone-800 p-6">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5 text-amber-600" /> Return to Supplier — {detail.po_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-[11px] text-stone-500">
                  Returning removes items from stock and reduces the received quantity. You can only return
                  what is still in stock (items already sold cannot be returned).
                </p>
                <div className="space-y-2">
                  {detail.items.filter((it: any) => Number(it.qty_received) > 0).length === 0 ? (
                    <div className="text-center text-stone-500 py-4 text-sm">No received items to return.</div>
                  ) : detail.items.filter((it: any) => Number(it.qty_received) > 0).map((it: any) => (
                    <div key={it.id} className="bg-gold-200 rounded-lg p-3 border border-amber-300/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-stone-800">{it.item_name}</span>
                        <span className="text-xs text-stone-500">Received: {Number(it.qty_received)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="text-[10px] text-stone-500">Return qty:</span>
                          <Input type="number" step="0.001" min="0" max={Number(it.qty_received)}
                            value={returnLines[it.id] ?? ""}
                            onChange={e => setReturnLines({ ...returnLines, [it.id]: e.target.value })}
                            className="w-24 h-9 bg-gold-100 border-amber-300/60 text-center text-xs" />
                        </div>
                        <span className="text-xs text-stone-500">
                          ₱{((Number(returnLines[it.id] || 0)) * Number(it.unit_cost)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Input placeholder="Reason (optional)" value={returnReason} onChange={e => setReturnReason(e.target.value)} className="bg-gold-100 border-amber-300/60 h-10" />

                <div className="flex justify-between items-center border-t border-amber-300/60 pt-3">
                  <span className="text-sm text-stone-500">Total Return Cost</span>
                  <span className="text-lg font-bold text-white">
                    ₱{detail.items.reduce((s: number, it: any) => s + (Number(returnLines[it.id] || 0) * Number(it.unit_cost)), 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
                  <Button onClick={submitReturn} disabled={returnSaving} className="bg-amber-600 hover:bg-amber-500 gap-1">
                    <Undo2 className="h-4 w-4" /> {returnSaving ? "Returning..." : "Confirm Return"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
