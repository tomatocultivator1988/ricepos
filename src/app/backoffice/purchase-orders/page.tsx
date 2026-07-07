"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, PackageCheck, ClipboardList, X } from "lucide-react"
import { toast } from "sonner"

interface POListItem {
  id: string; po_number: string; supplier_name: string; status: string;
  order_date: string; expected_date: string | null; total_cost: number;
  line_count: number; pct_received: number;
}
interface Supplier { id: string; name: string }
interface Product { id: string; name: string; sell_by: string; cost: number }

const STATUS_COLORS: Record<string, string> = {
  ordered: "bg-blue-600", partial: "bg-yellow-600", received: "bg-green-600", cancelled: "bg-stone-600",
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ClipboardList className="h-6 w-6 text-amber-400" /> Purchase Orders</h1>
          <p className="text-sm text-stone-400">{pos.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-36 bg-stone-800 border-amber-600/30 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-500"><Plus className="h-4 w-4" /> New PO</Button>
        </div>
      </div>

      {loading ? <div className="text-center text-stone-400 py-12">Loading...</div> : (
        <Card className="bg-stone-900/60 border-amber-600/30">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-600/30 hover:bg-transparent">
                  <TableHead className="text-stone-300">PO #</TableHead>
                  <TableHead className="text-stone-300">Supplier</TableHead>
                  <TableHead className="text-stone-300">Order Date</TableHead>
                  <TableHead className="text-stone-300">Expected</TableHead>
                  <TableHead className="text-stone-300 text-right">Purchase</TableHead>
                  <TableHead className="text-stone-300 text-center">Received</TableHead>
                  <TableHead className="text-stone-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-stone-500 py-8">No purchase orders</TableCell></TableRow>
                ) : pos.map(p => (
                  <TableRow key={p.id} className="border-amber-600/30 cursor-pointer hover:bg-stone-800/50" onClick={() => openDetail(p.id)}>
                    <TableCell className="text-white font-medium">{p.po_number}</TableCell>
                    <TableCell className="text-stone-300">{p.supplier_name}</TableCell>
                    <TableCell className="text-stone-400">{p.order_date}</TableCell>
                    <TableCell className="text-stone-400">{p.expected_date ?? "—"}</TableCell>
                    <TableCell className="text-right text-stone-300">₱{Number(p.total_cost).toFixed(2)}</TableCell>
                    <TableCell className="text-center text-stone-400">{p.pct_received}%</TableCell>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-stone-900 border-amber-600/30 text-white">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Supplier *</label>
                <Select value={cSupplier} onValueChange={v => setCSupplier(v ?? "")}>
                  <SelectTrigger className="bg-stone-800 border-amber-600/30"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Expected Date</label>
                <Input type="date" value={cExpected} onChange={e => setCExpected(e.target.value)} className="bg-stone-800 border-amber-600/30" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-amber-300">Order Items</label>
                <Button variant="outline" size="sm" onClick={addLine} className="text-xs gap-1"><Plus className="h-3 w-3" /> Add</Button>
              </div>
              <div className="space-y-2 overflow-x-auto">
                {cLines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end bg-stone-800/50 rounded-lg p-2 border border-amber-600/30">
                    <div className="col-span-6 space-y-1">
                      <label className="text-[10px] text-stone-500">Product</label>
                      <Select value={l.item_id} onValueChange={v => updateLine(i, "item_id", v ?? "")}>
                        <SelectTrigger className="bg-stone-700 border-stone-600 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] text-stone-500">Qty</label>
                      <Input type="number" step="0.001" value={l.qty_ordered} onChange={e => updateLine(i, "qty_ordered", e.target.value)} className="bg-stone-700 border-stone-600 h-8 text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] text-stone-500">Buy Cost</label>
                      <Input type="number" step="0.01" value={l.unit_cost} onChange={e => updateLine(i, "unit_cost", e.target.value)} className="bg-stone-700 border-stone-600 h-8 text-xs" />
                    </div>
                    <div className="col-span-2 text-right text-xs text-stone-300 self-center pt-4">
                      ₱{(Number(l.qty_ordered || 0) * Number(l.unit_cost || 0)).toFixed(2)}
                    </div>
                    <div className="col-span-1 flex justify-center pt-4">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeLine(i)} disabled={cLines.length <= 1}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Input placeholder="Note (optional)" value={cNote} onChange={e => setCNote(e.target.value)} className="bg-stone-800 border-amber-600/30" />

            <div className="flex justify-between items-center border-t border-amber-600/30 pt-3">
              <span className="text-sm text-stone-400">Total Purchase Cost</span>
              <span className="text-lg font-bold text-white">₱{createTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createPO} disabled={saving} className="bg-amber-600 hover:bg-amber-500">{saving ? "Creating..." : "Create PO"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL / RECEIVE DIALOG ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-stone-900 border-amber-600/30 text-white">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.po_number}
                  <Badge className={STATUS_COLORS[detail.status]}>{detail.status.toUpperCase()}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-stone-400">
                  {detail.supplier_name} · Ordered {detail.order_date}{detail.expected_date ? ` · Expected ${detail.expected_date}` : ""}
                </div>

                <div className="rounded-lg border border-amber-600/30 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-amber-600/30 text-stone-400">
                      <th className="text-left px-3 py-2">Product</th>
                      <th className="text-right px-3 py-2">Ordered</th>
                      <th className="text-right px-3 py-2">Received</th>
                      <th className="text-right px-3 py-2">Buy Cost/unit</th>
                      {canReceive && <th className="text-center px-3 py-2">Receive Now</th>}
                      {canReceive && <th className="text-center px-3 py-2">Sync Buy Cost?</th>}
                    </tr></thead>
                    <tbody>
                      {detail.items.map((it: any) => (
                        <tr key={it.id} className="border-b border-amber-600/20">
                          <td className="px-3 py-2 text-white">{it.item_name}</td>
                          <td className="px-3 py-2 text-right text-stone-300">{Number(it.qty_ordered)}</td>
                          <td className="px-3 py-2 text-right text-stone-400">{Number(it.qty_received)}</td>
                          <td className="px-3 py-2 text-right text-stone-400">₱{Number(it.unit_cost).toFixed(2)}</td>
                          {canReceive && (
                            <td className="px-3 py-2 text-center">
                              {it.remaining > 0 ? (
                                <Input type="number" step="0.001" min="0" max={it.remaining}
                                  value={recvLines[it.id]?.qty ?? ""}
                                  onChange={e => setRecvLines({ ...recvLines, [it.id]: { ...recvLines[it.id], qty: e.target.value } })}
                                  className="w-20 h-7 bg-stone-800 border-amber-600/30 text-center text-xs mx-auto" />
                              ) : <span className="text-green-400 text-[10px]">✓ done</span>}
                            </td>
                          )}
                          {canReceive && (
                            <td className="px-3 py-2 text-center">
                              {it.remaining > 0 && (
                                <input type="checkbox" checked={recvLines[it.id]?.updateCost ?? false}
                                  onChange={e => setRecvLines({ ...recvLines, [it.id]: { ...recvLines[it.id], updateCost: e.target.checked } })}
                                  className="accent-amber-500" title={`Set product cost to ₱${Number(it.unit_cost).toFixed(2)}`} />
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {canReceive && (
                  <p className="text-[11px] text-stone-500">
                    Tick "Sync Buy Cost?" to set the product's buying/wholesale cost (what you paid the supplier).
                    This affects <strong>profit</strong> on future sales. Leave unchecked to keep the current cost.
                    Your <strong>selling prices</strong> (what customers pay) are never changed.
                  </p>
                )}

                <div className="flex justify-between items-center border-t border-amber-600/30 pt-3">
                  <span className="text-sm text-stone-400">Total Purchase Cost</span>
                  <span className="text-lg font-bold text-white">₱{Number(detail.total_cost).toFixed(2)}</span>
                </div>

                <div className="flex justify-between gap-2">
                  {canReceive && (
                    <Button variant="outline" onClick={cancelPO} className="text-red-400 border-red-500/40 hover:bg-red-500/10">Cancel PO</Button>
                  )}
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
    </div>
  )
}
