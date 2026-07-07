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
import { Label } from "@/components/ui/label"
import { Plus, Search, X, Trash2, GripVertical, Check } from "lucide-react"
import { toast } from "sonner"

interface Category { id: string; name: string }
interface TaxRate { id: string; name: string; rate: number }
interface SellingUnit {
  id?: string; name: string; base_qty: number; price: number;
  min_qty: number; is_default: boolean; sort_order: number; is_active?: boolean;
}
interface Item {
  id: string; name: string; category_id: string | null; sell_by: "weight" | "unit";
  cost: number; barcode: string | null; stock_qty: number; min_stock: number;
  tax_rate_id: string | null; discount_eligible: boolean; status: string;
  image_url: string | null; selling_units: SellingUnit[];
}

const emptyUnit = (sellBy: string, idx: number): SellingUnit => ({
  name: sellBy === "weight" ? "Per Kilo" : "Piece",
  base_qty: 1, price: 0, min_qty: sellBy === "weight" ? 0.001 : 1,
  is_default: idx === 0, sort_order: idx, is_active: true,
})

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Item> | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/backoffice/items?includeInactive=true&q=${search}&category_id=${filterCat === "all" ? "" : filterCat}`)
    const json = await res.json()
    setItems(json.items ?? [])
    setCategories(json.categories ?? [])
    setTaxRates(json.taxRates ?? [])
    setLoading(false)
  }, [search, filterCat])

  useEffect(() => { fetchData() }, [fetchData])

  function openNew() {
    setEditing({ sell_by: "unit", cost: 0, min_stock: 0, discount_eligible: true, status: "active", selling_units: [emptyUnit("unit", 0)] })
    setDialogOpen(true)
  }

  function openEdit(item: Item) {
    setEditing({
      ...item,
      selling_units: (item.selling_units ?? []).filter(u => u.is_active !== false),
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!editing || !editing.name || editing.sell_by === undefined) {
      toast.error("Name and sell-by type are required")
      return
    }
    const validUnits = (editing.selling_units ?? []).filter(u => u.name.trim() && u.base_qty > 0)
    if (validUnits.length === 0) {
      toast.error("At least one selling unit is required")
      return
    }

    setSaving(true)
    const isNew = !editing.id
    const url = "/api/backoffice/items"
    const method = isNew ? "POST" : "PUT"

    const body: any = {
      name: editing.name.trim(),
      sell_by: editing.sell_by,
      category_id: editing.category_id || null,
      cost: Number(editing.cost ?? 0),
      barcode: editing.barcode || null,
      min_stock: Number(editing.min_stock ?? 0),
      tax_rate_id: editing.tax_rate_id || null,
      discount_eligible: editing.discount_eligible ?? true,
      status: editing.status ?? "active",
    }
    if (!isNew) body.id = editing.id

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error?.message || "Save failed"); setSaving(false); return }

      const itemId = isNew ? json.item.id : editing.id

      // Save selling units
      for (const unit of validUnits) {
        if (unit.id) {
          // Update existing
          await fetch(`/api/backoffice/items/${itemId}/units`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              unitId: unit.id, name: unit.name.trim(), base_qty: Number(unit.base_qty),
              price: Number(unit.price), min_qty: Number(unit.min_qty),
              is_default: unit.is_default, sort_order: unit.sort_order,
            }),
          })
        } else {
          // Create new
          await fetch(`/api/backoffice/items/${itemId}/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: unit.name.trim(), base_qty: Number(unit.base_qty),
              price: Number(unit.price), min_qty: Number(unit.min_qty),
              is_default: unit.is_default, sort_order: unit.sort_order,
            }),
          })
        }
      }

      toast.success(isNew ? "Item created" : "Item updated")
      setDialogOpen(false)
      setEditing(null)
      fetchData()
    } catch (e) {
      toast.error("Save failed")
    }
    setSaving(false)
  }

  function updateField(field: string, value: any) {
    setEditing(prev => prev ? { ...prev, [field]: value } : null)
  }

  function updateUnit(idx: number, field: string, value: any) {
    setEditing(prev => {
      if (!prev) return null
      const units = [...(prev.selling_units ?? [])]
      if (field === "is_default" && value) {
        units.forEach((u, i) => u.is_default = i === idx)
      } else {
        units[idx] = { ...units[idx], [field]: value }
      }
      return { ...prev, selling_units: units }
    })
  }

  function addUnit() {
    const sellBy = editing?.sell_by ?? "unit"
    setEditing(prev => {
      if (!prev) return null
      const units = [...(prev.selling_units ?? [])]
      units.push(emptyUnit(sellBy, units.length))
      return { ...prev, selling_units: units }
    })
  }

  function removeUnit(idx: number) {
    setEditing(prev => {
      if (!prev) return null
      const units = (prev.selling_units ?? []).filter((_, i) => i !== idx)
      return { ...prev, selling_units: units }
    })
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.barcode && i.barcode.includes(search))
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-stone-400">{items.length} items</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -transtone-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search by name or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-stone-800 border-amber-600/30 text-white"
          />
        </div>
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v ?? "all")}>
          <SelectTrigger className="w-[180px] bg-stone-800 border-amber-600/30 text-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-stone-400 py-12">Loading...</div>
      ) : (
        <div className="rounded-lg border border-amber-600/30 bg-stone-900/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-600/30 hover:bg-transparent">
                <TableHead className="text-stone-300">Name</TableHead>
                <TableHead className="text-stone-300">Category</TableHead>
                <TableHead className="text-stone-300">Type</TableHead>
                <TableHead className="text-stone-300">Cost</TableHead>
                <TableHead className="text-stone-300">Stock</TableHead>
                <TableHead className="text-stone-300">Selling Units</TableHead>
                <TableHead className="text-stone-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-stone-500 py-8">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow
                    key={item.id}
                    className="border-amber-600/30 cursor-pointer hover:bg-stone-800/50"
                    onClick={() => openEdit(item)}
                  >
                    <TableCell className="text-white font-medium">{item.name}</TableCell>
                    <TableCell className="text-stone-400">
                      {categories.find(c => c.id === item.category_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-stone-400">
                      <Badge variant={item.sell_by === "weight" ? "secondary" : "outline"}>
                        {item.sell_by === "weight" ? "Per Kilo" : "Per Piece"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-stone-300">₱{Number(item.cost).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={item.stock_qty <= 0 ? "text-red-400" : item.stock_qty <= item.min_stock ? "text-yellow-400" : "text-green-400"}>
                        {Number(item.stock_qty).toFixed(item.sell_by === "weight" ? 3 : 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400">
                      {(item.selling_units ?? []).filter(u => u.is_active !== false).length}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-stone-900/60 border-amber-600/30 text-white">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Name *</Label>
                  <Input value={editing.name ?? ""} onChange={e => updateField("name", e.target.value)}
                    className="bg-stone-800 border-amber-600/30" />
                </div>

                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={editing.category_id ?? "none"} onValueChange={v => updateField("category_id", v === "none" ? null : v)}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/30">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Sell By</Label>
                  <Select value={editing.sell_by ?? "unit"} onValueChange={v => updateField("sell_by", v)}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight">Weight (kg)</SelectItem>
                      <SelectItem value="unit">Unit (piece)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Cost (per base unit)</Label>
                  <Input type="number" step="0.01" value={editing.cost ?? 0} onChange={e => updateField("cost", e.target.value)}
                    className="bg-stone-800 border-amber-600/30" />
                </div>

                <div className="space-y-1">
                  <Label>Min Stock</Label>
                  <Input type="number" step="0.001" value={editing.min_stock ?? 0} onChange={e => updateField("min_stock", e.target.value)}
                    className="bg-stone-800 border-amber-600/30" />
                </div>

                <div className="space-y-1">
                  <Label>Barcode</Label>
                  <Input value={editing.barcode ?? ""} onChange={e => updateField("barcode", e.target.value || null)}
                    placeholder="Scan or type..." className="bg-stone-800 border-amber-600/30" />
                </div>

                <div className="space-y-1">
                  <Label>Tax Rate</Label>
                  <Select value={editing.tax_rate_id ?? "none"} onValueChange={v => updateField("tax_rate_id", v === "none" ? null : v)}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/30">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {taxRates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({(t.rate * 100).toFixed(0)}%)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editing.status ?? "active"} onValueChange={v => updateField("status", v)}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="discEl" checked={editing.discount_eligible ?? true}
                    onChange={e => updateField("discount_eligible", e.target.checked)} />
                  <Label htmlFor="discEl">Eligible for Senior/PWD discount</Label>
                </div>
              </div>

              {/* Selling Units */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Selling Units</Label>
                  <Button variant="outline" size="sm" onClick={addUnit} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add Unit
                  </Button>
                </div>

                <div className="space-y-2 overflow-x-auto">
                  {(editing.selling_units ?? []).map((unit, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-stone-800/50 rounded-lg p-3 border border-amber-600/30">
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input value={unit.name} onChange={e => updateUnit(idx, "name", e.target.value)}
                          className="bg-stone-700 border-stone-600 h-8 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Base Qty</Label>
                        <Input type="number" step="0.001" value={unit.base_qty} onChange={e => updateUnit(idx, "base_qty", e.target.value)}
                          className="bg-stone-700 border-stone-600 h-8 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Price (₱)</Label>
                        <Input type="number" step="0.01" value={unit.price} onChange={e => updateUnit(idx, "price", e.target.value)}
                          className="bg-stone-700 border-stone-600 h-8 text-sm" />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Min Qty</Label>
                        <Input type="number" step="0.001" value={unit.min_qty} onChange={e => updateUnit(idx, "min_qty", e.target.value)}
                          className="bg-stone-700 border-stone-600 h-8 text-sm" />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Sort</Label>
                        <Input type="number" value={unit.sort_order} onChange={e => updateUnit(idx, "sort_order", e.target.value)}
                          className="bg-stone-700 border-stone-600 h-8 text-sm" />
                      </div>
                      <div className="col-span-1 flex flex-col items-center gap-1 pt-1">
                        <Button
                          variant={unit.is_default ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          title="Set as default"
                          onClick={() => updateUnit(idx, "is_default", !unit.is_default)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <span className="text-[10px] text-stone-500">Default</span>
                      </div>
                      <div className="col-span-1 flex flex-col items-center pt-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => removeUnit(idx)}
                          disabled={(editing.selling_units ?? []).length <= 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {(editing.selling_units ?? []).length === 0 && (
                  <p className="text-sm text-stone-500 text-center py-4">No selling units. Add at least one.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-amber-600/30">
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null) }}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : editing?.id ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
