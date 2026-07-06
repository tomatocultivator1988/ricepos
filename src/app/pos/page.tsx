"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, LayoutDashboardIcon, StoreIcon, Search, ShoppingCart, X, Plus, Minus, User, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useCart, type CartItem } from "@/hooks/use-cart"
import { toast } from "sonner"

interface CatalogItem {
  id: string; name: string; category_id: string | null;
  sell_by: "weight" | "unit"; stock_qty: number; min_stock: number;
  tax_rate_id: string | null; discount_eligible: boolean; image_url: string | null;
  stock_status: "ok" | "low" | "out";
  units: { id: string; name: string; base_qty: number; price: number; min_qty: number; is_default: boolean }[];
  default_price: number;
}
interface Category { id: string; name: string; sort_order: number }
interface CustomerResult { id: string; name: string; contact?: string; type: string; balance?: number }

export default function PosPage() {
  const [user, setUser] = useState<{ name: string; role: string; employeeId: string } | null>(null)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [activeCat, setActiveCat] = useState("all")
  const [loading, setLoading] = useState(true)
  const [unitPicker, setUnitPicker] = useState<CatalogItem | null>(null)
  const [pickerQty, setPickerQty] = useState("1")
  const [custModal, setCustModal] = useState(false)
  const [custSearch, setCustSearch] = useState("")
  const [custResults, setCustResults] = useState<CustomerResult[]>([])
  const [payModal, setPayModal] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const cart = useCart()

  // Auth
  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser(d.employee)
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  // Load catalog
  useEffect(() => {
    fetch("/api/catalog").then(r => r.json()).then(d => {
      setCatalog(d.items ?? [])
      fetch("/api/backoffice/categories").then(r => r.json()).then(c => {
        setCategories(c.categories ?? [])
      })
      setLoading(false)
    })
  }, [])

  // Barcode scanner
  useEffect(() => {
    let buffer = ""
    let timer: NodeJS.Timeout | null = null
    const handleKey = (e: KeyboardEvent) => {
      if (payModal || unitPicker || custModal) return
      if (e.key === "Enter" && buffer.length >= 8) {
        scanBarcode(buffer)
        buffer = ""
        return
      }
      if (e.key.length === 1) {
        buffer += e.key
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => { buffer = "" }, 80)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  function scanBarcode(code: string) {
    const item = catalog.find(i => {
      // Find by barcode — need to check items table
      return false // barcode lookup requires API call
    })
    if (!item) {
      // Try searching catalog by name match or fetch by barcode
      fetch(`/api/backoffice/items?q=${code}`).then(r => r.json()).then(d => {
        const found = (d.items ?? []).find((i: any) => i.barcode === code)
        if (found) openUnitPicker(catalog.find(c => c.id === found.id) ?? null, found)
        else toast.error(`Barcode ${code} not found`)
      })
      return
    }
    openUnitPicker(item, item)
  }

  function openUnitPicker(catItem: CatalogItem | null, source?: any) {
    if (!catItem || catItem.stock_status === "out") return
    setUnitPicker(catItem)
    const defUnit = catItem.units.find(u => u.is_default) ?? catItem.units[0]
    const minQty = defUnit?.min_qty ?? (catItem.sell_by === "weight" ? 0.001 : 1)
    setPickerQty(String(minQty))
  }

  function addToCart() {
    if (!unitPicker) return
    const selectedUnit = unitPicker.units[0] // TODO: unit selection
    const qty = Number(pickerQty)
    if (!qty || qty <= 0) return
    const totalDeduct = qty * selectedUnit.base_qty
    if (totalDeduct > unitPicker.stock_qty) {
      toast.error(`Only ${Number(unitPicker.stock_qty).toFixed(unitPicker.sell_by === "weight" ? 3 : 0)} available`)
      return
    }
    cart.addItem({
      itemId: unitPicker.id,
      itemName: unitPicker.name,
      categoryId: unitPicker.category_id,
      unitId: selectedUnit.id,
      unitName: selectedUnit.name,
      baseQty: selectedUnit.base_qty,
      qty,
      unitPrice: selectedUnit.price,
      stockQty: unitPicker.stock_qty,
      sellBy: unitPicker.sell_by,
      taxRate: 0, // will be fetched from tax rate
      discountEligible: unitPicker.discount_eligible,
    })
    setUnitPicker(null)
    toast.success(`Added ${unitPicker.name} (${selectedUnit.name})`)
  }

  // Customer search
  function openCustomerSearch() { setCustModal(true); setCustSearch(""); setCustResults([]) }
  function searchCustomers(q: string) {
    setCustSearch(q)
    if (q.length < 1) { setCustResults([]); return }
    fetch(`/api/backoffice/customers?q=${q}`).then(r => r.json()).then(d => {
      setCustResults(d.customers ?? [])
    })
  }
  function selectCustomer(c: CustomerResult) {
    // Compute balance live
    cart.setCustomer(c.id, c.name, c.balance ?? 0)
    setCustModal(false)
  }

  // Discount
  const discountOptions = [
    { value: "none", label: "No Discount" },
    { value: "senior", label: "Senior 20%" },
    { value: "pwd", label: "PWD 20%" },
  ]

  const filtered = catalog.filter(i => {
    if (activeCat !== "all" && i.category_id !== activeCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  if (!user) return null

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2 text-white shrink-0">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-emerald-400" />
          <h1 className="text-sm font-bold">GroceryPOS</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-slate-300">{user.name}</Badge>
          {user.role === "admin" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard")}>
              <LayoutDashboardIcon className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={handleLogout}>
            <LogOutIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-3 py-2 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input ref={searchRef} placeholder="Search or scan barcode..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white h-9" />
            </div>
            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button onClick={() => setActiveCat("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat === "all" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                All
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat === c.id ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">Loading catalog...</div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filtered.map(item => (
                  <button key={item.id}
                    onClick={() => openUnitPicker(item)}
                    disabled={item.stock_status === "out"}
                    className={`relative flex flex-col items-center p-3 rounded-xl border transition-all text-left
                      ${item.stock_status === "out"
                        ? "bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed"
                        : "bg-slate-800/60 border-slate-700 hover:border-emerald-500 hover:bg-slate-800 cursor-pointer"}`}>
                    {item.stock_status === "out" && <Badge className="absolute top-1 right-1 text-[10px] bg-red-600">OUT</Badge>}
                    {item.stock_status === "low" && <Badge className="absolute top-1 right-1 text-[10px] bg-yellow-600">LOW</Badge>}
                    <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center mb-2">
                      <span className="text-lg">{item.sell_by === "weight" ? "⚖" : "📦"}</span>
                    </div>
                    <span className="text-xs font-medium text-white text-center leading-tight line-clamp-2">{item.name}</span>
                    <span className="text-xs text-emerald-400 mt-1 font-semibold">₱{Number(item.default_price).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Stock: {Number(item.stock_qty).toFixed(item.sell_by === "weight" ? 1 : 0)}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center text-slate-500 py-12">No products found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className={`${showCart ? 'fixed inset-0 z-40' : 'hidden'} lg:relative lg:flex lg:z-0 w-full lg:w-[380px] flex-col border-l border-slate-800 bg-slate-900 shrink-0`}>
          <div className="flex items-center justify-between p-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white text-sm">Cart ({cart.items.length})</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setShowCart(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {cart.items.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-sm">Cart is empty</div>
            ) : (
              cart.items.map(item => {
                const key = cart.mergeKey(item)
                return (
                  <div key={key} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.itemName}</p>
                      <p className="text-[10px] text-slate-400">{item.unitName} · ₱{Number(item.unitPrice).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => cart.updateQty(key, item.qty - (item.sellBy === "weight" ? 0.1 : 1))}
                        className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-medium text-white w-10 text-center tabular-nums">
                        {item.sellBy === "weight" ? Number(item.qty).toFixed(item.qty % 1 === 0 ? 1 : 3) : item.qty}
                      </span>
                      <button onClick={() => cart.updateQty(key, item.qty + (item.sellBy === "weight" ? 0.1 : 1))}
                        className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => cart.removeItem(key)} className="h-6 w-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Cart footer */}
          <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Discount:</span>
              <Select value={cart.discount.type ?? "none"} onValueChange={v => {
                if (v === "none") cart.setDiscount({ type: null, value: 0, name: "" })
                else if (v === "senior") cart.setDiscount({ type: "senior", value: 20, name: "Senior 20%" })
                else if (v === "pwd") cart.setDiscount({ type: "pwd", value: 20, name: "PWD 20%" })
              }}>
                <SelectTrigger className="h-7 text-xs w-[140px] bg-slate-800 border-slate-700">
                  <SelectValue placeholder="No Discount" />
                </SelectTrigger>
                <SelectContent>
                  {discountOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Customer:</span>
              {cart.customerId ? (
                <button onClick={openCustomerSearch} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                  <User className="h-3 w-3" /> {cart.customerName}
                  {cart.customerBalance > 0 && <span className="text-yellow-400">(utang: ₱{cart.customerBalance.toFixed(2)})</span>}
                </button>
              ) : (
                <button onClick={openCustomerSearch} className="text-xs text-slate-500 hover:text-white">
                  Walk-in ▾
                </button>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₱{cart.subtotal.toFixed(2)}</span></div>
              {cart.discountAmount > 0 && <div className="flex justify-between text-red-400"><span>{cart.discount.name}</span><span>-₱{cart.discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-slate-400"><span>Tax</span><span>₱{cart.taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold text-white border-t border-slate-700 pt-1">
                <span>TOTAL</span><span>₱{cart.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={cart.clearCart}
                disabled={cart.items.length === 0}>Clear</Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                disabled={cart.items.length === 0}
                onClick={() => setPayModal(true)}>
                <CreditCard className="h-3 w-3 mr-1" /> Pay
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile cart toggle */}
        <button onClick={() => setShowCart(true)}
          className="lg:hidden fixed bottom-4 right-4 z-30 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center">
          <ShoppingCart className="h-6 w-6" />
          {cart.items.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
              {cart.items.length}
            </span>
          )}
        </button>
      </div>

      {/* Unit Picker Modal */}
      <Dialog open={!!unitPicker} onOpenChange={() => setUnitPicker(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-base">{unitPicker?.name}</DialogTitle>
          </DialogHeader>
          {unitPicker && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Available: {Number(unitPicker.stock_qty).toFixed(unitPicker.sell_by === "weight" ? 1 : 0)} {unitPicker.sell_by === "weight" ? "kg" : "pcs"}
              </p>
              <div className="space-y-2">
                {unitPicker.units.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-2 rounded bg-slate-800 text-xs">
                    <span>{u.name}</span>
                    <span className="font-semibold text-emerald-400">₱{Number(u.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Quantity:</span>
                <Input type="number" value={pickerQty} onChange={e => setPickerQty(e.target.value)}
                  step={unitPicker.sell_by === "weight" ? "0.1" : "1"}
                  min={unitPicker.units[0]?.min_qty ?? (unitPicker.sell_by === "weight" ? 0.001 : 1)}
                  className="bg-slate-800 border-slate-700 h-9 text-sm" />
              </div>
              <p className="text-xs text-slate-500">
                Total: {(Number(pickerQty || 0) * (unitPicker.units[0]?.base_qty ?? 1)).toFixed(unitPicker.sell_by === "weight" ? 1 : 0)} {unitPicker.sell_by === "weight" ? "kg" : "pcs"} = 
                ₱{(Number(pickerQty || 0) * (unitPicker.units[0]?.price ?? 0)).toFixed(2)}
              </p>
              <Button onClick={addToCart} className="w-full bg-emerald-600 hover:bg-emerald-500">
                Add to Cart
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Search Modal */}
      <Dialog open={custModal} onOpenChange={setCustModal}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-base">Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search customer..." value={custSearch} onChange={e => searchCustomers(e.target.value)}
              className="bg-slate-800 border-slate-700" />
            <button onClick={() => { cart.setCustomer(null, "", 0); setCustModal(false) }}
              className="w-full text-left p-2 rounded bg-slate-800 text-sm text-slate-400 hover:bg-slate-700">Walk-in (no customer)</button>
            {custResults.map(c => (
              <button key={c.id} onClick={() => selectCustomer(c)}
                className="w-full text-left p-2 rounded bg-slate-800 text-sm hover:bg-slate-700">
                <div className="font-medium text-white">{c.name}</div>
                <div className="text-xs text-slate-400">{c.type} {c.contact ? `· ${c.contact}` : ""}</div>
                {c.balance !== undefined && c.balance > 0 && (
                  <div className="text-xs text-yellow-400">Utang: ₱{c.balance.toFixed(2)}</div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal — placeholder */}
      <Dialog open={payModal} onOpenChange={setPayModal}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Payment — Phase 4</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-center text-2xl font-bold">₱{cart.total.toFixed(2)}</p>
            <p className="text-center text-sm text-slate-400">Payment processing coming in Phase 4</p>
            <Button onClick={() => setPayModal(false)} className="w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
