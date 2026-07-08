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
import { Plus, Search, X, Trash2, GripVertical, Check, PackageIcon, LayersIcon } from "lucide-react"
import { toast } from "sonner"
import { CategoriesManager } from "@/components/categories-manager"

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
  const [activeTab, setActiveTab] = useState("products")
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Item> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Item | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  async function confirmDelete() {
    if (!deleteItem) return
    setDeleteSaving(true)
    const delRes = await fetch(`/api/backoffice/items/${deleteItem.id}`, { method: "DELETE" })
    if (!delRes.ok) { toast.error("Delete failed"); setDeleteSaving(false); return }
    toast.success(`"${deleteItem.name}" deleted`)
    setDeleteItem(null); setDeleteSaving(false)
    fetchData()
  }

  function openDeleteDialog(item: Item, e: React.MouseEvent) {
    e.stopPropagation(); setDeleteItem(item)
  }

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
      category_id: categories.find(c => c.id === item.category_id) ? item.category_id : null,
      tax_rate_id: taxRates.find(t => t.id === item.tax_rate_id) ? item.tax_rate_id : null,
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

  const riceCatId = categories.find(c => c.name.toLowerCase() === "rice")?.id
  const showSplit = filterCat === "all" && riceCatId
  const riceItems = showSplit ? filtered.filter(i => i.category_id === riceCatId) : []
  const otherItems = showSplit ? filtered.filter(i => i.category_id !== riceCatId) : filtered

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <div className="flex gap-1">
          {[{ key: "products", label: "Products", icon: PackageIcon }, { key: "categories", label: "Categories", icon: LayersIcon }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === tab.key ? "bg-primary text-white" : "bg-gold-100 text-stone-500 hover:text-white"}`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">{items.length} items</p>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
          </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
          <Input
            placeholder="Search by name or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-gold-100 border-amber-300/60 text-stone-800"
          />
        </div>
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v ?? "all")}>
          <SelectTrigger className="w-[180px] bg-gold-100 border-amber-300/60 text-stone-800">
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
        <div className="text-center text-stone-500 py-12">Loading...</div>
      ) : (
        <div className="rounded-lg border border-amber-300/60 bg-gold-200/90 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-300/60 hover:bg-transparent">
                <TableHead className="text-stone-700">Name</TableHead>
                <TableHead className="text-stone-700">Category</TableHead>
                <TableHead className="text-stone-700">Type</TableHead>
                <TableHead className="text-stone-700">Cost</TableHead>
                <TableHead className="text-stone-700">Stock</TableHead>
                <TableHead className="text-stone-700">Selling Units</TableHead>
                <TableHead className="text-stone-700">Status</TableHead>
                <TableHead className="text-stone-700 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-stone-500 py-8">
                    No products found
                  </TableCell>
                </TableRow>
              ) : showSplit ? (
                <>
                  {riceItems.length > 0 && (
                    <>
                      <TableRow className="border-amber-300/60 hover:bg-transparent">
                        <TableCell colSpan={8} className="px-3 py-2 bg-primary/10">
                          <span className="text-xs font-bold text-amber-600 tracking-wider uppercase">Rice</span>
                        </TableCell>
                      </TableRow>
                      {riceItems.map(item => (
                        <TableRow key={item.id} className="border-amber-300/60 cursor-pointer hover:bg-white" onClick={() => openEdit(item)}>
                          <TableCell className="text-stone-800 font-medium">{item.name}</TableCell>
                          <TableCell className="text-stone-500">{categories.find(c => c.id === item.category_id)?.name ?? "—"}</TableCell>
                          <TableCell className="text-stone-500"><Badge variant={item.sell_by === "weight" ? "secondary" : "outline"}>{item.sell_by === "weight" ? "Per Kilo" : "Per Piece"}</Badge></TableCell>
                          <TableCell className="text-stone-700">₱{Number(item.cost).toFixed(2)}</TableCell>
                          <TableCell><span className={item.stock_qty <= 0 ? "text-red-600" : item.stock_qty <= item.min_stock ? "text-amber-600" : "text-green-700"}>{Number(item.stock_qty).toFixed(item.sell_by === "weight" ? 3 : 0)}</span></TableCell>
                          <TableCell className="text-stone-500">{(item.selling_units ?? []).filter(u => u.is_active !== false).length}</TableCell>
                          <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={(e) => openDeleteDialog(item, e)} title="Delete item">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                  {otherItems.length > 0 && (
                    <>
                      <TableRow className="border-amber-300/60 hover:bg-transparent">
                        <TableCell colSpan={8} className="px-3 py-2 bg-white/20">
                          <span className="text-xs font-bold text-stone-500 tracking-wider uppercase">Other Items</span>
                        </TableCell>
                      </TableRow>
                      {otherItems.map(item => (
                        <TableRow key={item.id} className="border-amber-300/60 cursor-pointer hover:bg-white" onClick={() => openEdit(item)}>
                          <TableCell className="text-stone-800 font-medium">{item.name}</TableCell>
                          <TableCell className="text-stone-500">{categories.find(c => c.id === item.category_id)?.name ?? "—"}</TableCell>
                          <TableCell className="text-stone-500"><Badge variant={item.sell_by === "weight" ? "secondary" : "outline"}>{item.sell_by === "weight" ? "Per Kilo" : "Per Piece"}</Badge></TableCell>
                          <TableCell className="text-stone-700">₱{Number(item.cost).toFixed(2)}</TableCell>
                          <TableCell><span className={item.stock_qty <= 0 ? "text-red-600" : item.stock_qty <= item.min_stock ? "text-amber-600" : "text-green-700"}>{Number(item.stock_qty).toFixed(item.sell_by === "weight" ? 3 : 0)}</span></TableCell>
                          <TableCell className="text-stone-500">{(item.selling_units ?? []).filter(u => u.is_active !== false).length}</TableCell>
                          <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={(e) => openDeleteDialog(item, e)} title="Delete item">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id} className="border-amber-300/60 cursor-pointer hover:bg-white" onClick={() => openEdit(item)}>
                    <TableCell className="text-stone-800 font-medium">{item.name}</TableCell>
                    <TableCell className="text-stone-500">{categories.find(c => c.id === item.category_id)?.name ?? "—"}</TableCell>
                    <TableCell className="text-stone-500"><Badge variant={item.sell_by === "weight" ? "secondary" : "outline"}>{item.sell_by === "weight" ? "Per Kilo" : "Per Piece"}</Badge></TableCell>
                    <TableCell className="text-stone-700">₱{Number(item.cost).toFixed(2)}</TableCell>
                    <TableCell><span className={item.stock_qty <= 0 ? "text-red-600" : item.stock_qty <= item.min_stock ? "text-amber-600" : "text-green-700"}>{Number(item.stock_qty).toFixed(item.sell_by === "weight" ? 3 : 0)}</span></TableCell>
                    <TableCell className="text-stone-500">{(item.selling_units ?? []).filter(u => u.is_active !== false).length}</TableCell>
                    <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={(e) => openDeleteDialog(item, e)} title="Delete item">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gold-200/80 backdrop-blur-md border-amber-300/60 text-stone-800 p-6">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Basic Info */}
                <div className="space-y-4 min-w-0">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-stone-500">Name *</Label>
                    <Input value={editing.name ?? ""} onChange={e => updateField("name", e.target.value)}
                      className="bg-gold-100 border-amber-300/60 h-10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-stone-500">Category</Label>
                      <Select key={editing.id ?? "new"} value={editing.category_id && categories.some(c => c.id === editing.category_id) ? editing.category_id : "none"} onValueChange={v => updateField("category_id", v === "none" ? null : v)}>
                        <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><span className="text-stone-800">{categories.find(c => c.id === editing.category_id)?.name || "None"}</span></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-stone-500">Sell By</Label>
                      <Select value={editing.sell_by ?? "unit"} onValueChange={v => updateField("sell_by", v)}>
                        <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="weight">Weight (kg)</SelectItem><SelectItem value="unit">Unit (piece)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-stone-500">Cost</Label>
                      <Input type="number" step="0.01" value={editing.cost ?? 0} onChange={e => updateField("cost", e.target.value)}
                        className="bg-gold-100 border-amber-300/60 h-10" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-stone-500">Min Stock</Label>
                      <Input type="number" step="0.001" value={editing.min_stock ?? 0} onChange={e => updateField("min_stock", e.target.value)}
                        className="bg-gold-100 border-amber-300/60 h-10" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-stone-500">Tax Rate</Label>
                      <Select key={editing.id ?? "new"} value={editing.tax_rate_id && taxRates.some(t => t.id === editing.tax_rate_id) ? editing.tax_rate_id : "none"} onValueChange={v => updateField("tax_rate_id", v === "none" ? null : v)}>
                        <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><span className="text-stone-800">{editing.tax_rate_id ? taxRates.find(t => t.id === editing.tax_rate_id) ? `${taxRates.find(t => t.id === editing.tax_rate_id)!.name} (${(taxRates.find(t => t.id === editing.tax_rate_id)!.rate * 100).toFixed(0)}%)` : "None" : "None"}</span></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem>{taxRates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({(t.rate * 100).toFixed(0)}%)</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-stone-500">Status</Label>
                      <Select value={editing.status ?? "active"} onValueChange={v => updateField("status", v)}>
                        <SelectTrigger className="bg-gold-100 border-amber-300/60 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-stone-500">Barcode</Label>
                    <Input value={editing.barcode ?? ""} onChange={e => updateField("barcode", e.target.value || null)}
                      placeholder="Scan or type..." className="bg-gold-100 border-amber-300/60 h-10" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.discount_eligible ?? true}
                      onChange={e => updateField("discount_eligible", e.target.checked)} className="accent-amber-500" />
                    <span className="text-xs font-medium text-stone-500">Senior/PWD discount</span>
                  </label>
                </div>

                {/* Right: Selling Units */}
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-amber-600">Selling Units</Label>
                    <Button variant="outline" size="sm" onClick={addUnit} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
                  </div>
                  {(editing.selling_units ?? []).length === 0 ? (
                    <p className="text-xs text-stone-500 text-center py-6 border border-dashed border-stone-700 rounded-lg">No units yet</p>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {(editing.selling_units ?? []).map((unit, idx) => (
                        <div key={idx} className="bg-gold-200 rounded-xl p-4 border border-amber-300/60 space-y-3">
                          <Input value={unit.name} onChange={e => updateUnit(idx, "name", e.target.value)}
                            placeholder="e.g. Per Kilo, Sack 50kg"
                            className="bg-gold-100 border-amber-300/60 h-10 text-sm w-full" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-stone-500 font-medium">Base Qty</span>
                              <Input type="number" step="0.001" value={unit.base_qty} onChange={e => updateUnit(idx, "base_qty", e.target.value)}
                                className="bg-gold-100 border-amber-300/60 h-9 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-stone-500 font-medium">Price (₱)</span>
                              <Input type="number" step="0.01" value={unit.price} onChange={e => updateUnit(idx, "price", e.target.value)}
                                className="bg-gold-100 border-amber-300/60 h-9 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-stone-500 font-medium">Min Qty</span>
                              <Input type="number" step="0.001" value={unit.min_qty} onChange={e => updateUnit(idx, "min_qty", e.target.value)}
                                className="bg-gold-100 border-amber-300/60 h-9 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-stone-500 font-medium">Sort Order</span>
                              <Input type="number" value={unit.sort_order} onChange={e => updateUnit(idx, "sort_order", e.target.value)}
                                className="bg-gold-100 border-amber-300/60 h-9 text-sm" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="defaultUnit" checked={unit.is_default}
                                onChange={() => updateUnit(idx, "is_default", !unit.is_default)}
                                className="h-4 w-4 accent-amber-500" />
                              <span className="text-xs text-stone-500 font-medium">Default</span>
                            </label>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-300"
                              onClick={() => removeUnit(idx)} disabled={(editing.selling_units ?? []).length <= 1}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 flex justify-end gap-3 pt-4 border-t border-amber-200/50 bg-stone-900/40 -mx-6 px-6 pb-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null) }}>Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-primary hover:bg-amber-400">
                  {saving ? "Saving..." : editing?.id ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="sm:max-w-sm bg-gold-200/90 border-amber-300/60 text-stone-800 p-5">
          <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-stone-600">Deactivate <strong>{deleteItem?.name}</strong>? It will no longer appear in POS or catalog. Stock will remain in inventory. This cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete} disabled={deleteSaving}>
              {deleteSaving ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      )}

      {activeTab === "categories" && (
        <CategoriesManager />
      )}
    </div>
  )
}
