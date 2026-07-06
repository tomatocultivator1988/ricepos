"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, X, Loader2Icon, UtensilsCrossedIcon, SettingsIcon, PencilIcon, PackagePlusIcon } from "lucide-react"

type Product = { id: string; name: string; price: number; categoryName: string; variantCount: number; recipeCount: number; categoryId: string | null; itemType: string | null }
type Variant = { id: string; productId: string; sizeLabel: string; price: number }
type RecipeItem = { id: string; variantId: string; ingredientId: string; ingredientName: string; quantity: number }
type ItemOption = { id: string; name: string }
type CategoryOption = { id: string; name: string }

export default function ItemsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<ItemOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Edit recipe dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [recipe, setRecipe] = useState<RecipeItem[]>([])
  const [variantLoading, setVariantLoading] = useState(false)

  // New / Edit detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(true)
  const [formName, setFormName] = useState("")
  const [formPrice, setFormPrice] = useState("0")
  const [formCategory, setFormCategory] = useState("")
  const [formType, setFormType] = useState("product")
  const [formStock, setFormStock] = useState("0")
  const [formMinStock, setFormMinStock] = useState("5")
  const [formCost, setFormCost] = useState("")
  const [formImage, setFormImage] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Variant form
  const [newSizeLabel, setNewSizeLabel] = useState("")
  const [newSizePrice, setNewSizePrice] = useState("")
  const [selectedVariantId, setSelectedVariantId] = useState("")

  // Recipe form
  const [newIngredientId, setNewIngredientId] = useState("")
  const [newIngredientQty, setNewIngredientQty] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch("/api/catalog").then(r => r.json()),
        fetch("/api/backoffice/categories").then(r => r.json()).catch(() => ({ categories: [] })),
      ])

      const cats = catsRes.categories || []
      setCategories(cats)

      const allItems: any[] = itemsRes.items || []
      const itemList = allItems.filter((i: any) =>
        i.price > 0 && i.item_type !== 'ingredient' && i.item_type !== 'supply'
      )

      const result: Product[] = await Promise.all(itemList.map(async (i: any) => {
        let varCount = 0; let recipeCount = 0
        try {
          const vr = await fetch(`/api/backoffice/items/${i.id}/variants`).then(r => r.json())
          varCount = vr.variants?.length || 0
          if (varCount > 0) {
            const rr = await fetch(`/api/backoffice/items/${vr.variants[0].id}/ingredients`).then(r => r.json())
            recipeCount = rr.ingredients?.length || 0
          }
        } catch { }
        return {
          id: i.id, name: i.name, price: Number(i.price),
          categoryName: cats.find((c: any) => c.id === i.category_id)?.name || "-",
          categoryId: i.category_id, itemType: i.item_type || 'product',
          variantCount: varCount, recipeCount,
        }
      }))
      setProducts(result)
    } catch { }
    finally { setLoading(false) }
  }

  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/backoffice/inventory").then(r => r.json())
      const allIngs = res.ingredients || []
      // Also get all items marked as ingredient or supply for the dropdown
      const catRes = await fetch("/api/catalog").then(r => r.json())
      const allItems: any[] = catRes.items || []
      const trackable = allItems.filter((i: any) => i.track_stock === true)
      setIngredients(trackable.map((i: any) => ({ id: i.id, name: i.name })))
    } catch { }
  }

  useEffect(() => { fetchData(); fetchIngredients() }, [])

  // --- New Item dialog ---
  const openNew = () => {
    setIsNewItem(true)
    setFormName(""); setFormPrice("0"); setFormCategory("")
    setFormType("product"); setFormStock("0"); setFormMinStock("5"); setFormCost(""); setFormImage("")
    setDetailOpen(true)
  }

  const openEditDetail = (p: Product) => {
    setIsNewItem(false)
    setEditProduct(p)
    setFormName(p.name); setFormPrice(String(p.price)); setFormCategory(p.categoryId || "")
    setFormType(p.itemType || "product"); setFormStock("0"); setFormMinStock("5"); setFormCost(""); setFormImage("")
    setDetailOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Name required"); return }
    setSaving(true)
    try {
      let imageUrl = ""
      if (isNewItem) {
        const res = await fetch("/api/backoffice/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            price: formType === 'product' ? Number(formPrice) : 0,
            categoryId: formCategory || null,
            itemType: formType,
            trackStock: formType !== 'product',
            stockQty: Number(formStock),
            minStock: Number(formMinStock),
            cost: formCost ? Number(formCost) : undefined,
          }),
        })
        if (!res.ok) throw new Error()
        const created = await res.json()
        const newId = created.item?.id || created.id
        if (formImage && newId) {
          try {
            await fetch(`/api/backoffice/items/${newId}/image`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: formImage }),
            })
          } catch { }
        }
        toast.success(`${formName} created`)
      } else if (editProduct) {
        const res = await fetch(`/api/backoffice/items/${editProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            price: Number(formPrice),
            categoryId: formCategory || null,
          }),
        })
        if (!res.ok) throw new Error()
        if (formImage && editProduct) {
          try {
            await fetch(`/api/backoffice/items/${editProduct.id}/image`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: formImage }),
            })
          } catch { }
        }
        toast.success(`${formName} updated`)
      }
      setDetailOpen(false)
      fetchData()
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  // --- Edit Recipe dialog ---
  const openEdit = async (product: Product) => {
    setEditProduct(product); setEditOpen(true); setVariantLoading(true)
    try {
      const vr = await fetch(`/api/backoffice/items/${product.id}/variants`).then(r => r.json())
      const vars = vr.variants || []; setVariants(vars)
      if (vars.length > 0) {
        setSelectedVariantId(vars[0].id)
        const rr = await fetch(`/api/backoffice/items/${vars[0].id}/ingredients`).then(r => r.json())
        setRecipe(rr.ingredients || [])
      } else { setSelectedVariantId(""); setRecipe([]) }
    } catch { }
    finally { setVariantLoading(false) }
  }

  const switchVariant = async (variantId: string) => {
    setSelectedVariantId(variantId)
    try {
      const rr = await fetch(`/api/backoffice/items/${variantId}/ingredients`).then(r => r.json())
      setRecipe(rr.ingredients || [])
    } catch { }
  }

  const addVariant = async () => {
    if (!newSizeLabel || !newSizePrice || !editProduct) return
    try {
      const res = await fetch(`/api/backoffice/items/${editProduct.id}/variants`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeLabel: newSizeLabel, price: Number(newSizePrice) }),
      })
      if (!res.ok) throw new Error()
      const v = await res.json()
      setVariants(prev => [...prev, v]); setNewSizeLabel(""); setNewSizePrice("")
      toast.success("Size added")
    } catch { toast.error("Failed to add size") }
  }

  const deleteVariant = async (variantId: string) => {
    if (!editProduct) return
    try {
      await fetch(`/api/backoffice/items/${editProduct.id}/variants?variantId=${variantId}`, { method: "DELETE" })
      setVariants(prev => prev.filter(v => v.id !== variantId))
      if (selectedVariantId === variantId) { setSelectedVariantId(""); setRecipe([]) }
      toast.success("Size removed")
    } catch { toast.error("Failed to remove size") }
  }

  const addIngredient = async () => {
    if (!newIngredientId || !newIngredientQty || !selectedVariantId) return
    try {
      const res = await fetch(`/api/backoffice/items/${editProduct?.id}/ingredients`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariantId, ingredientId: newIngredientId, quantity: Number(newIngredientQty) }),
      })
      if (!res.ok) throw new Error()
      const ing = await res.json()
      setRecipe(prev => [...prev, ing]); setNewIngredientId(""); setNewIngredientQty("")
      toast.success("Ingredient added")
    } catch { toast.error("Failed to add ingredient") }
  }

  const deleteIngredient = async (id: string) => {
    try {
      await fetch(`/api/backoffice/items/${editProduct?.id}/ingredients?id=${id}`, { method: "DELETE" })
      setRecipe(prev => prev.filter(r => r.id !== id))
      toast.success("Ingredient removed")
    } catch { toast.error("Failed to remove ingredient") }
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-transparent">
      <Loader2Icon className="h-8 w-8 animate-spin text-gold-300" />
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-transparent">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gold-200 flex items-center gap-2">
              <UtensilsCrossedIcon className="h-6 w-6" />
              Menu Items
            </h1>
            <Button onClick={openNew} className="bg-brewhas-700 hover:bg-brewhas-800 text-white rounded-xl gap-2">
              <Plus className="h-4 w-4" /> New Item
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-10 rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl pl-9" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => (
              <div key={p.id} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-5 shadow-md hover:border-gold-400/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gold-200">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.categoryName}</p>
                  </div>
                  <span className="text-lg font-extrabold text-gold-200">P{p.price.toFixed(0)}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                  <span>{p.variantCount} size{p.variantCount !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{p.recipeCount} ingredient{p.recipeCount !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => openEdit(p)} variant="outline" size="sm"
                    className="flex-1 rounded-xl border-brewhas-700/40 text-gold-300 hover:bg-transparent">
                    <SettingsIcon className="mr-1 h-3.5 w-3.5" /> Recipe
                  </Button>
                  <Button onClick={() => openEditDetail(p)} variant="outline" size="sm"
                    className="flex-1 rounded-xl border-brewhas-700/40 text-gold-300 hover:bg-transparent">
                    <PencilIcon className="mr-1 h-3.5 w-3.5" /> Details
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <PackagePlusIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm font-medium">No menu items yet</p>
              <Button onClick={openNew} variant="outline" className="mt-3 rounded-xl">Create your first item</Button>
            </div>
          )}
        </div>
      </div>

      {/* NEW ITEM / EDIT DETAILS DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-300">
              {isNewItem ? "New Item" : `Edit: ${editProduct?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400">Name</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Cafe Latte"
                className="h-10 rounded-xl border-brewhas-700/40" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Category</label>
              <Select value={categories.find(c => c.id === formCategory)?.name || ""} onValueChange={(v) => setFormCategory(categories.find(c => c.name === v)?.id || "")}>
                <SelectTrigger className="h-10 rounded-xl border-brewhas-700/40"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Type</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { key: 'product', label: 'Menu Item' },
                  { key: 'ingredient', label: 'Ingredient' },
                  { key: 'supply', label: 'Supply' },
                ].map(opt => (
                  <button key={opt.key}
                    onClick={() => setFormType(opt.key)}
                    className={`rounded-xl border-2 py-2 text-xs font-bold transition-all ${formType === opt.key ? "border-brewhas-500 bg-transparent text-gold-200" : "border-slate-200 text-slate-400 hover:border-brewhas-700/40"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {formType === 'product' && (
              <div>
                <label className="text-xs font-medium text-slate-400">Price</label>
                <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                  className="h-10 rounded-xl border-brewhas-700/40" />
              </div>
            )}

            {formType !== 'product' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Starting Stock</label>
                    <Input type="number" value={formStock} onChange={e => setFormStock(e.target.value)}
                      className="h-10 rounded-xl border-brewhas-700/40" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Min Stock</label>
                    <Input type="number" value={formMinStock} onChange={e => setFormMinStock(e.target.value)}
                      className="h-10 rounded-xl border-brewhas-700/40" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Cost per Unit</label>
                  <Input type="number" value={formCost} onChange={e => setFormCost(e.target.value)} placeholder="Optional"
                    className="h-10 rounded-xl border-brewhas-700/40" />
                </div>
              </>
            )}
            {formType === 'product' && (
              <div>
                <label className="text-xs font-medium text-slate-400">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-gold-400/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gold-300"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const img = new Image()
                      img.onload = () => {
                        const MAX_W = 500
                        let w = img.width, h = img.height
                        if (w > MAX_W) { h = Math.round(h * (MAX_W / w)); w = MAX_W }
                        const canvas = document.createElement("canvas")
                        canvas.width = w; canvas.height = h
                        const ctx = canvas.getContext("2d")!
                        ctx.drawImage(img, 0, 0, w, h)
                        setFormImage(canvas.toDataURL("image/jpeg", 0.85))
                      }
                      img.src = reader.result as string
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                {formImage && (
                  <div className="mt-2 relative inline-block">
                    <img src={formImage} alt="Preview" className="h-16 w-16 rounded-xl object-cover border-2 border-brewhas-700/40" />
                    <button onClick={() => setFormImage("")} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">x</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brewhas-700 hover:bg-brewhas-800 text-white">
              {saving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isNewItem ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT RECIPE DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gold-300">Edit Recipe: {editProduct?.name}</DialogTitle>
          </DialogHeader>

          {variantLoading ? (
            <div className="flex justify-center py-8"><Loader2Icon className="h-6 w-6 animate-spin text-brewhas-600" /></div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gold-300 mb-2">Sizes / Variants</h3>
                <div className="space-y-2 mb-3">
                  {variants.map(v => (
                    <div key={v.id} className="flex items-center justify-between rounded-xl border border-brewhas-700/50 bg-transparent/30 px-3 py-2">
                      <div>
                        <span className="text-sm font-semibold text-gold-300">{v.sizeLabel}</span>
                        <span className="text-sm text-slate-400 ml-2">P{v.price.toFixed(0)}</span>
                      </div>
                      <button onClick={() => deleteVariant(v.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Size name" value={newSizeLabel} onChange={e => setNewSizeLabel(e.target.value)} className="h-9 rounded-xl border-brewhas-700/40" />
                  <Input placeholder="Price" type="number" value={newSizePrice} onChange={e => setNewSizePrice(e.target.value)} className="h-9 w-24 rounded-xl border-brewhas-700/40" />
                  <Button onClick={addVariant} size="sm" className="bg-brewhas-700 hover:bg-brewhas-800 text-white rounded-xl"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <hr className="border-brewhas-700/50" />

              {variants.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gold-300 mb-2">Recipe Ingredients</h3>
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {variants.map(v => (
                      <button key={v.id} onClick={() => switchVariant(v.id)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${selectedVariantId === v.id ? "bg-brewhas-700 text-white" : "border-2 border-brewhas-700/40 text-gold-300 hover:bg-transparent"}`}>
                        {v.sizeLabel}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {recipe.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl px-3 py-1.5 text-xs">
                        <span className="text-gold-400">{r.ingredientName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gold-300 font-bold tabular-nums">{r.quantity}</span>
                          <button onClick={() => deleteIngredient(r.id)} className="text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                    {recipe.length === 0 && <p className="text-xs text-slate-400 py-2">No ingredients set for this size</p>}
                  </div>
                  <div className="flex gap-2">
                    <select value={newIngredientId} onChange={e => setNewIngredientId(e.target.value)}
                      className="flex-1 h-9 rounded-xl border-2 border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl text-xs px-2">
                      <option value="">Select ingredient...</option>
                      {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                    </select>
                    <Input placeholder="Qty" type="number" step="0.001" value={newIngredientQty} onChange={e => setNewIngredientQty(e.target.value)}
                      className="h-9 w-20 rounded-xl border-brewhas-700/40" />
                    <Button onClick={addIngredient} size="sm" className="bg-brewhas-700 hover:bg-brewhas-800 text-white rounded-xl"><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
