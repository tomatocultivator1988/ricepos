"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, TruckIcon, SlidersHorizontal, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

interface InvItem {
  id: string; name: string; sell_by: string; stock_qty: number;
  min_stock: number; cost: number; value: number; stock_status: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InvItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [adjustItem, setAdjustItem] = useState<InvItem | null>(null)
  const [adjType, setAdjType] = useState("spoilage")
  const [adjQty, setAdjQty] = useState("")
  const [adjReason, setAdjReason] = useState("")
  const [adjSaving, setAdjSaving] = useState(false)

  const [deliverItem, setDeliverItem] = useState<InvItem | null>(null)
  const [delivQty, setDelivQty] = useState("")
  const [delivSupplier, setDelivSupplier] = useState("")
  const [delivSaving, setDelivSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/backoffice/inventory")
    const json = await res.json()
    setItems(json.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveAdjustment() {
    if (!adjustItem || !adjQty) { toast.error("Enter quantity"); return }
    setAdjSaving(true)
    const delta = adjType === "physical_count" ? Number(adjQty) - adjustItem.stock_qty : -Math.abs(Number(adjQty))
    const res = await fetch("/api/backoffice/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: adjustItem.id, adjustmentType: adjType, quantity: delta, reason: adjReason }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Failed"); setAdjSaving(false); return }
    toast.success(`Stock adjusted to ${json.newQty}`)
    setAdjustItem(null); setAdjQty(""); setAdjReason(""); setAdjSaving(false)
    fetchData()
  }

  async function saveDelivery() {
    if (!deliverItem || !delivQty || Number(delivQty) <= 0) { toast.error("Enter quantity"); return }
    setDelivSaving(true)
    const res = await fetch("/api/backoffice/deliveries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier: delivSupplier, items: [{ itemId: deliverItem.id, quantity: Number(delivQty) }] }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Failed"); setDelivSaving(false); return }
    toast.success(`Received ${delivQty}. New stock: ${json.received[0]?.newQty}`)
    setDeliverItem(null); setDelivQty(""); setDelivSupplier(""); setDelivSaving(false)
    fetchData()
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const totalValue = items.reduce((s, i) => s + i.value, 0)
  const lowCount = items.filter(i => i.stock_status !== "ok").length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-sm text-stone-400">Total value: ₱{totalValue.toFixed(2)} · {lowCount} low/out</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -transtone-y-1/2 h-4 w-4 text-stone-400" />
        <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-stone-800 border-amber-600/30 text-white" />
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-emerald-400" /></div> : (
        <Card className="bg-stone-900/60 border-amber-600/30">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-600/30 hover:bg-transparent">
                  <TableHead className="text-stone-300">Product</TableHead>
                  <TableHead className="text-stone-300 text-right">On Hand</TableHead>
                  <TableHead className="text-stone-300 text-right">Min</TableHead>
                  <TableHead className="text-stone-300 text-right">Value</TableHead>
                  <TableHead className="text-stone-300">Status</TableHead>
                  <TableHead className="text-stone-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => (
                  <TableRow key={i.id} className="border-amber-600/30">
                    <TableCell className="text-white font-medium">{i.name}</TableCell>
                    <TableCell className="text-right text-stone-300">{Number(i.stock_qty).toFixed(i.sell_by === "weight" ? 3 : 0)} {i.sell_by === "weight" ? "kg" : "pc"}</TableCell>
                    <TableCell className="text-right text-stone-500">{Number(i.min_stock).toFixed(i.sell_by === "weight" ? 1 : 0)}</TableCell>
                    <TableCell className="text-right text-stone-400">₱{i.value.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={i.stock_status === "ok" ? "bg-emerald-600" : i.stock_status === "low" ? "bg-yellow-600" : "bg-red-600"}>
                        {i.stock_status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400" onClick={() => { setDeliverItem(i); setDelivQty(""); setDelivSupplier("") }}>
                          <TruckIcon className="h-3 w-3 mr-1" />Receive
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-yellow-400" onClick={() => { setAdjustItem(i); setAdjQty(""); setAdjReason(""); setAdjType("spoilage") }}>
                          <SlidersHorizontal className="h-3 w-3 mr-1" />Adjust
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delivery Modal */}
      <Dialog open={!!deliverItem} onOpenChange={() => setDeliverItem(null)}>
        <DialogContent className="max-w-sm bg-stone-900/60 border-amber-600/30 text-white">
          <DialogHeader><DialogTitle>Receive Delivery — {deliverItem?.name}</DialogTitle></DialogHeader>
          {deliverItem && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400">Current: {Number(deliverItem.stock_qty).toFixed(deliverItem.sell_by === "weight" ? 3 : 0)} {deliverItem.sell_by === "weight" ? "kg" : "pc"}</p>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Supplier (optional)</label>
                <Input value={delivSupplier} onChange={e => setDelivSupplier(e.target.value)} className="bg-stone-800 border-amber-600/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Quantity received ({deliverItem.sell_by === "weight" ? "kg" : "pcs"})</label>
                <Input type="number" step={deliverItem.sell_by === "weight" ? "0.1" : "1"} value={delivQty} onChange={e => setDelivQty(e.target.value)} className="bg-stone-800 border-amber-600/30" />
                <p className="text-xs text-stone-500">Delivery increases stock only (cost is set in Products).</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeliverItem(null)}>Cancel</Button>
                <Button onClick={saveDelivery} disabled={delivSaving} className="bg-emerald-600 hover:bg-emerald-500">{delivSaving ? "..." : "Receive"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjustment Modal */}
      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent className="max-w-sm bg-stone-900/60 border-amber-600/30 text-white">
          <DialogHeader><DialogTitle>Adjust Stock — {adjustItem?.name}</DialogTitle></DialogHeader>
          {adjustItem && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400">Current: {Number(adjustItem.stock_qty).toFixed(adjustItem.sell_by === "weight" ? 3 : 0)}</p>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Type</label>
                <Select value={adjType} onValueChange={v => setAdjType(v ?? "spoilage")}>
                  <SelectTrigger className="bg-stone-800 border-amber-600/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spoilage">Spoilage</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="moisture_loss">Moisture Loss</SelectItem>
                    <SelectItem value="physical_count">Physical Count (set exact)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">{adjType === "physical_count" ? "Actual counted quantity" : "Quantity to remove"}</label>
                <Input type="number" step="0.001" value={adjQty} onChange={e => setAdjQty(e.target.value)} className="bg-stone-800 border-amber-600/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Reason</label>
                <Input value={adjReason} onChange={e => setAdjReason(e.target.value)} className="bg-stone-800 border-amber-600/30" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button>
                <Button onClick={saveAdjustment} disabled={adjSaving} className="bg-yellow-600 hover:bg-yellow-500">{adjSaving ? "..." : "Adjust"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
