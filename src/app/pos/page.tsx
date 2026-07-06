"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, LayoutDashboardIcon, StoreIcon, Search, ShoppingCart, X, Plus, Minus, User, CreditCard, Loader2Icon, BanknoteIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCart, type CartItem } from "@/hooks/use-cart"
import { toast } from "sonner"

interface CatalogItem {
  id: string; name: string; category_id: string | null; sell_by: "weight" | "unit";
  stock_qty: number; min_stock: number; tax_rate_id: string | null;
  tax_rate: number; discount_eligible: boolean; stock_status: string;
  units: { id: string; name: string; base_qty: number; price: number; min_qty: number; is_default: boolean }[];
  default_price: number;
}
interface Category { id: string; name: string; sort_order: number }
interface CustomerResult { id: string; name: string; contact?: string; type: string; balance?: number }

export default function PosPage() {
  const [{ user, catalog, categories }, setData] = useState<{
    user: { name: string; role: string; employeeId: string } | null;
    catalog: CatalogItem[]; categories: Category[];
  }>({ user: null, catalog: [], categories: [] })
  const [search, setSearch] = useState("")
  const [activeCat, setActiveCat] = useState("all")
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [payCash, setPayCash] = useState("")
  const [payGcash, setPayGcash] = useState("")
  const [paySaving, setPaySaving] = useState(false)

  // Unit picker state
  const [upItem, setUpItem] = useState<CatalogItem | null>(null)
  const [upUnit, setUpUnit] = useState<string>("")
  const [upQty, setUpQty] = useState("1")

  // Customer search state
  const [custModal, setCustModal] = useState(false)
  const [custSearch, setCustSearch] = useState("")
  const [custResults, setCustResults] = useState<CustomerResult[]>([])

  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const cart = useCart()

  // Collections
  const [collModal, setCollModal] = useState(false)
  const [collSearch, setCollSearch] = useState("")
  const [collResults, setCollResults] = useState<CustomerResult[]>([])
  const [collSelected, setCollSelected] = useState<{ id: string; name: string; balance: number } | null>(null)
  const [collAmount, setCollAmount] = useState("")
  const [collMethod, setCollMethod] = useState("cash")
  const [collSaving, setCollSaving] = useState(false)

  // Auth
  useEffect(() => { fetch("/api/pos/me").then(r => r.json()).then(d => {
    if (d.employee) setData(prev => ({ ...prev, user: d.employee }))
    else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
  }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }) }, [router])

  // Catalog
  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then(r => r.json()),
      fetch("/api/backoffice/categories").then(r => r.json()),
    ]).then(([catJson, catCatJson]) => {
      setData(prev => ({ ...prev, catalog: catJson.items ?? [], categories: catCatJson.categories ?? [] }))
      setLoading(false)
    })
  }, [])

  // Barcode scanner
  useEffect(() => {
    let buf = ""; let t: NodeJS.Timeout | null = null
    const h = (e: KeyboardEvent) => {
      if (payModal || upItem || custModal) return
      if (e.key === "Enter" && buf.length >= 8) { scanBarcode(buf); buf = ""; return }
      if (e.key.length === 1) { buf += e.key; if (t) clearTimeout(t); t = setTimeout(() => { buf = "" }, 80) }
    }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  })

  function scanBarcode(code: string) {
    fetch(`/api/backoffice/items?q=${code}`).then(r => r.json()).then(d => {
      const match = (d.items ?? []).find((i: any) => i.barcode === code)
      if (match) {
        const catItem = catalog.find(c => c.id === match.id)
        if (catItem) openUnitPicker(catItem)
        else toast("Product found but not in active catalog")
      } else {
        toast.error(`Barcode ${code} not found`)
      }
    })
  }

  function openUnitPicker(item: CatalogItem) {
    if (item.stock_status === "out") return
    const d = item.units.find(u => u.is_default) ?? item.units[0]
    setUpItem(item); setUpUnit(d?.id ?? ""); setUpQty(String(d?.min_qty ?? (item.sell_by === "weight" ? 0.001 : 1)))
  }

  function addToCart() {
    if (!upItem || !upUnit) return
    const unit = upItem.units.find(u => u.id === upUnit)
    if (!unit) return
    const qty = Number(upQty)
    if (!qty || qty <= 0) return
    if (qty * unit.base_qty > upItem.stock_qty) {
      toast.error(`Only ${Number(upItem.stock_qty).toFixed(upItem.sell_by==="weight"?3:0)} available`)
      return
    }
    cart.addItem({
      itemId: upItem.id, itemName: upItem.name, categoryId: upItem.category_id,
      unitId: unit.id, unitName: unit.name, baseQty: unit.base_qty, qty,
      unitPrice: unit.price, stockQty: upItem.stock_qty,
      sellBy: upItem.sell_by, taxRate: upItem.tax_rate,
      discountEligible: upItem.discount_eligible,
    })
    setUpItem(null)
  }

  // Customer
  function openCustomerSearch() { setCustModal(true); setCustSearch(""); setCustResults([]) }
  function searchCustomers(q: string) {
    setCustSearch(q);
    if (q.length < 1) { setCustResults([]); return }
    fetch(`/api/backoffice/customers?q=${encodeURIComponent(q)}`).then(r => r.json())
      .then(d => setCustResults(d.customers ?? []))
  }

  // Payment
  function openPay() {
    setPayCash(String(cart.total.toFixed(2)))
    setPayGcash("0")
    setPayModal(true)
  }

  async function processPayment() {
    const cash = Number(payCash) || 0
    const gcash = Number(payGcash) || 0
    if (cash + gcash <= 0 && !cart.customerId) {
      toast.error("Enter a payment amount or select a customer for utang"); return
    }
    if (cash + gcash > cart.total) {
      toast.error("Payment exceeds total"); return
    }
    setPaySaving(true)
    const payments: { method: string; amount: number }[] = []
    if (cash > 0) payments.push({ method: "cash", amount: cash })
    if (gcash > 0) payments.push({ method: "gcash", amount: gcash })

    try {
      const res = await fetch("/api/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map(i => ({ itemId: i.itemId, itemName: i.itemName, unitId: i.unitId, unitName: i.unitName, baseQty: i.baseQty, qty: i.qty, unitPrice: i.unitPrice, discountEligible: i.discountEligible })),
          payments,
          customerId: cart.customerId,
          discountType: cart.discount.type, discountValue: cart.discount.value,
          discountAmount: cart.discountAmount, discountName: cart.discount.name,
          subtotal: cart.subtotal, taxTotal: cart.taxTotal, total: cart.total,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || "Sale failed"); setPaySaving(false); return }

      // Receipt
      const sn = String(json.sale.sale_number).padStart(6, "0")
      try {
        const { printReceipt } = await import("@/lib/utils/printer")
        await printReceipt({
          header: "GroceryPOS",
          subtitle: `TIN: — | Address: —`,
          items: cart.items.map(i => ({ name: `${i.itemName} (${i.unitName})`, qty: i.qty, price: i.unitPrice * i.qty })),
          subtotal: cart.subtotal, discount: cart.discountAmount, tax: cart.taxTotal, total: cart.total,
          paymentMethod: payments.map(p => `${p.method} ₱${p.amount}`).join(" + "),
          amountTendered: cash + gcash,
          change: Math.max(0, cash + gcash - cart.total),
          orderNumber: sn,
          date: new Date().toLocaleString("en-PH"),
          cashier: user?.name || "Cashier",
          footer: "Salamat po! Come again!",
        })
      } catch { /* print failed */ }

      // Cash drawer
      if (cash > 0) {
        try {
          const { openCashDrawer } = await import("@/lib/utils/cash-drawer")
          await openCashDrawer()
        } catch { /* drawer failed */ }
      }

      toast.success(`Sale #${sn} — ₱${json.sale.total.toFixed(2)}`)
      cart.clearCart()
      setPayModal(false)
      setPayCash(""); setPayGcash("")

      // Refresh catalog to update stock
      fetch("/api/catalog").then(r => r.json()).then(d =>
        setData(prev => ({ ...prev, catalog: d.items ?? [] }))
      )
    } catch { toast.error("Sale failed") }
    setPaySaving(false)
  }

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

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2Icon className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  )

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* ══ HEADER ══ */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-emerald-400" />
          <h1 className="text-sm font-bold text-white">GroceryPOS</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-slate-300 text-xs">{user.name}</Badge>
          {user.role === "admin" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push("/dashboard")}>
              <LayoutDashboardIcon className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={handleLogout}>
            <LogOutIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ══ PRODUCT GRID ══ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input ref={searchRef} placeholder="Search or scan barcode..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white h-9" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button onClick={() => setActiveCat("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat==="all"?"bg-emerald-600 text-white":"bg-slate-800 text-slate-400 hover:text-white"}`}>All</button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat===c.id?"bg-emerald-600 text-white":"bg-slate-800 text-slate-400 hover:text-white"}`}>{c.name}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">Loading catalog...</div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filtered.map(item => (
                  <button key={item.id} onClick={() => openUnitPicker(item)} disabled={item.stock_status==="out"}
                    className={`relative flex flex-col items-center p-3 rounded-xl border transition-all text-left ${item.stock_status==="out"?"bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed":"bg-slate-800/60 border-slate-700 hover:border-emerald-500 hover:bg-slate-800 cursor-pointer"}`}>
                    {item.stock_status==="out"&&<Badge className="absolute top-1 right-1 text-[10px] bg-red-600">OUT</Badge>}
                    {item.stock_status==="low"&&<Badge className="absolute top-1 right-1 text-[10px] bg-yellow-600">LOW</Badge>}
                    <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center mb-2">
                      <span className="text-lg">{item.sell_by==="weight"?"⚖":"📦"}</span>
                    </div>
                    <span className="text-xs font-medium text-white text-center leading-tight line-clamp-2">{item.name}</span>
                    <span className="text-xs text-emerald-400 mt-1 font-semibold">₱{Number(item.default_price).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Stock: {Number(item.stock_qty).toFixed(item.sell_by==="weight"?1:0)}</span>
                  </button>
                ))}
                {filtered.length===0&&<div className="col-span-full text-center text-slate-500 py-12">No products found</div>}
              </div>
            </div>
          )}
        </div>

        {/* ══ CART SIDEBAR ══ */}
        <div className={`${showCart?"fixed inset-0 z-40":"hidden"} lg:relative lg:flex lg:z-0 w-full lg:w-[380px] flex-col border-l border-slate-800 bg-slate-900 shrink-0`}>
          <div className="flex items-center justify-between p-3 border-b border-slate-800">
            <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-400"/><span className="font-semibold text-white text-sm">Cart ({cart.items.length})</span></div>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={()=>setShowCart(false)}><X className="h-4 w-4"/></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {cart.items.length===0?<div className="text-center text-slate-500 py-8 text-sm">Cart is empty</div>:cart.items.map(item=>{const k=cart.mergeKey(item);return(
              <div key={k} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2">
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-white truncate">{item.itemName}</p><p className="text-[10px] text-slate-400">{item.unitName} · ₱{Number(item.unitPrice).toFixed(2)}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>cart.updateQty(k,item.qty-(item.sellBy==="weight"?0.1:1))} className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"><Minus className="h-3 w-3"/></button>
                  <span className="text-xs font-medium text-white w-10 text-center">{item.sellBy==="weight"?Number(item.qty).toFixed(item.qty%1===0?1:3):item.qty}</span>
                  <button onClick={()=>cart.updateQty(k,item.qty+(item.sellBy==="weight"?0.1:1))} className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"><Plus className="h-3 w-3"/></button>
                </div>
                <button onClick={()=>cart.removeItem(k)} className="h-6 w-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400"><X className="h-3 w-3"/></button>
              </div>
            )})}
          </div>
          <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Discount:</span>
              <Select value={cart.discount.type??"none"} onValueChange={v=>{if(v==="none")cart.setDiscount({type:null,value:0,name:""});else if(v==="senior")cart.setDiscount({type:"senior",value:20,name:"Senior 20%"});else if(v==="pwd")cart.setDiscount({type:"pwd",value:20,name:"PWD 20%"})}}>
                <SelectTrigger className="h-7 text-xs w-[140px] bg-slate-800 border-slate-700"><SelectValue placeholder="No Discount"/></SelectTrigger>
                <SelectContent>{discountOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Customer:</span>
              {cart.customerId?<button onClick={openCustomerSearch} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><User className="h-3 w-3"/>{cart.customerName}{cart.customerBalance>0&&<span className="text-yellow-400">(utang: ₱{cart.customerBalance.toFixed(2)})</span>}</button>:<button onClick={openCustomerSearch} className="text-xs text-slate-500 hover:text-white">Walk-in ▾</button>}
            </div>
            <div className="space-y-0.5 text-xs border-t border-slate-700 pt-2">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₱{cart.subtotal.toFixed(2)}</span></div>
              {cart.discountAmount>0&&<div className="flex justify-between text-red-400"><span>{cart.discount.name}</span><span>-₱{cart.discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-slate-400"><span>Tax</span><span>₱{cart.taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold text-white pt-1"><span>TOTAL</span><span>₱{cart.total.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-2"><Button variant="outline" size="sm" className="flex-1" onClick={cart.clearCart} disabled={cart.items.length===0}>Clear</Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-500" disabled={cart.items.length===0} onClick={openPay}><CreditCard className="h-3 w-3 mr-1"/>Pay</Button></div>
          </div>
        </div>

        {/* Mobile cart toggle */}
        <button onClick={()=>setShowCart(true)} className="lg:hidden fixed bottom-4 right-4 z-30 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center">
          <ShoppingCart className="h-6 w-6"/>{cart.items.length>0&&<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">{cart.items.length}</span>}
        </button>
      </div>

      {/* ══ UNIT PICKER ══ */}
      <Dialog open={!!upItem} onOpenChange={()=>setUpItem(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>{upItem?.name}</DialogTitle></DialogHeader>
          {upItem&&(<div className="space-y-4">
            <p className="text-xs text-slate-400">Available: {Number(upItem.stock_qty).toFixed(upItem.sell_by==="weight"?1:0)} {upItem.sell_by==="weight"?"kg":"pcs"}</p>
            <div className="space-y-1.5">
              {upItem.units.map(u=>(<label key={u.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${upUnit===u.id?"border-emerald-500 bg-emerald-500/10":"border-slate-700 bg-slate-800"}`}>
                <input type="radio" name="unit" value={u.id} checked={upUnit===u.id} onChange={()=>{setUpUnit(u.id);setUpQty(String(u.min_qty??(upItem.sell_by==="weight"?0.001:1)))}} className="accent-emerald-500"/>
                <div className="flex-1"><span className="text-sm font-medium">{u.name}</span><span className="text-xs text-slate-400 ml-2">({u.base_qty} {upItem.sell_by==="weight"?"kg":"pc"} base)</span></div>
                <span className="text-sm font-bold text-emerald-400">₱{Number(u.price).toFixed(2)}</span>
              </label>))}
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Quantity:</span>
              <Input type="number" value={upQty} onChange={e=>setUpQty(e.target.value)}
                step={upItem.sell_by==="weight"?"0.1":"1"} min={upItem.units.find(u=>u.id===upUnit)?.min_qty??(upItem.sell_by==="weight"?0.001:1)}
                className="bg-slate-800 border-slate-700 h-9 text-sm"/>
            </div>
            {upUnit&&(<p className="text-xs text-slate-500">Total: {(Number(upQty||0)*(upItem.units.find(u=>u.id===upUnit)?.base_qty??1)).toFixed(upItem.sell_by==="weight"?1:0)} {upItem.sell_by==="weight"?"kg":"pcs"} = ₱{(Number(upQty||0)*(upItem.units.find(u=>u.id===upUnit)?.price??0)).toFixed(2)}</p>)}
            <Button onClick={addToCart} className="w-full bg-emerald-600 hover:bg-emerald-500">Add to Cart</Button>
          </div>)}
        </DialogContent>
      </Dialog>

      {/* ══ CUSTOMER SEARCH ══ */}
      <Dialog open={custModal} onOpenChange={setCustModal}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white"><DialogHeader><DialogTitle>Select Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search customer..." value={custSearch} onChange={e=>searchCustomers(e.target.value)} className="bg-slate-800 border-slate-700"/>
            <button onClick={()=>{cart.setCustomer(null,"",0);setCustModal(false)}} className="w-full text-left p-2 rounded bg-slate-800 text-sm text-slate-400 hover:bg-slate-700">Walk-in (no customer)</button>
            {custResults.map(c=>(<button key={c.id} onClick={()=>{cart.setCustomer(c.id,c.name,c.balance??0);setCustModal(false)}} className="w-full text-left p-2 rounded bg-slate-800 text-sm hover:bg-slate-700">
              <div className="font-medium text-white">{c.name}</div><div className="text-xs text-slate-400">{c.type}{c.contact?` · ${c.contact}`:""}</div>
              {c.balance!==undefined&&c.balance>0&&<div className="text-xs text-yellow-400">Utang: ₱{c.balance.toFixed(2)}</div>}
            </button>))}
          </div></DialogContent>
      </Dialog>

      {/* ══ PAYMENT OVERLAY ══ */}
      <Dialog open={payModal} onOpenChange={setPayModal}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-center"><span className="text-3xl font-bold text-white">₱{cart.total.toFixed(2)}</span></p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Cash</label>
                <Input type="number" step="0.01" value={payCash} onChange={e=>setPayCash(e.target.value)} className="bg-slate-800 border-slate-700"/>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">GCash</label>
                <Input type="number" step="0.01" value={payGcash} onChange={e=>setPayGcash(e.target.value)} className="bg-slate-800 border-slate-700"/>
              </div>
              <div className="border-t border-slate-700 pt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Paid</span><span className="text-white font-semibold">₱{((Number(payCash)||0)+(Number(payGcash)||0)).toFixed(2)}</span></div>
                {((Number(payCash)||0)+(Number(payGcash)||0))<cart.total&&(<div className="flex justify-between"><span className="text-yellow-400">To Balance</span><span className="text-yellow-400 font-semibold">₱{(cart.total-(Number(payCash)||0)-(Number(payGcash)||0)).toFixed(2)}</span></div>)}
                {(Number(payCash)||0)>cart.total&&(<div className="flex justify-between"><span className="text-emerald-400">Change</span><span className="text-emerald-400 font-semibold">₱{((Number(payCash)||0)-cart.total).toFixed(2)}</span></div>)}
              </div>
              {cart.customerId&&<div className="text-xs text-slate-400">Customer: {cart.customerName} {cart.customerBalance>0?`(existing utang: ₱${cart.customerBalance.toFixed(2)})`:""}</div>}
              {!cart.customerId&&((Number(payCash)||0)+(Number(payGcash)||0))<cart.total&&<p className="text-xs text-red-400 text-center">Select a customer to have a balance</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={()=>setPayModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500" onClick={processPayment} disabled={paySaving}>{paySaving?<Loader2Icon className="h-4 w-4 animate-spin"/>:"Confirm Payment"}</Button>
            </div>
          </div></DialogContent>
      </Dialog>

      {/* ══ COLLECTIONS MODAL ══ */}
      <Dialog open={collModal} onOpenChange={setCollModal}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>Collections (Utang Payment)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!collSelected ? (
              <>
                <Input placeholder="Search customer..." value={collSearch} onChange={e => {
                  setCollSearch(e.target.value)
                  if (e.target.value.length < 1) { setCollResults([]); return }
                  fetch(`/api/backoffice/customers?q=${encodeURIComponent(e.target.value)}`).then(r => r.json()).then(d => setCollResults(d.customers ?? []))
                }} className="bg-slate-800 border-slate-700" />
                {collResults.map((c: any) => (
                  <button key={c.id} onClick={() => setCollSelected({ id: c.id, name: c.name, balance: c.balance ?? 0 })}
                    className="w-full text-left p-2 rounded bg-slate-800 text-sm hover:bg-slate-700">
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-xs text-yellow-400">Utang: ₱{(c.balance ?? 0).toFixed(2)}</div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="p-3 rounded bg-slate-800">
                  <p className="text-sm font-medium">{collSelected.name}</p>
                  <p className="text-xl font-bold text-yellow-400">Balance: ₱{collSelected.balance.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" placeholder="Amount" value={collAmount} onChange={e => setCollAmount(e.target.value)} className="bg-slate-800 border-slate-700 flex-1" />
                  <Select value={collMethod} onValueChange={v => setCollMethod(v ?? "cash")}>
                    <SelectTrigger className="w-28 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="gcash">GCash</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setCollSelected(null); setCollAmount(""); setCollModal(false) }}>Cancel</Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                    onClick={async () => {
                      if (!collAmount || Number(collAmount) <= 0) { toast.error("Enter a valid amount"); return }
                      if (Number(collAmount) > collSelected.balance) { toast.error(`Amount exceeds balance (₱${collSelected.balance.toFixed(2)})`); return }
                      setCollSaving(true)
                      const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: collSelected.id, amount: Number(collAmount), method: collMethod }) })
                      const json = await res.json()
                      if (!res.ok) { toast.error(json.error || "Collection failed"); setCollSaving(false); return }
                      toast.success(`Collected ₱${Number(collAmount).toFixed(2)}. Balance: ₱${json.newBalance.toFixed(2)}`)
                      setCollSaving(false); setCollModal(false); setCollSelected(null); setCollAmount("")
                    }}
                    disabled={collSaving}>{collSaving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Record Payment"}</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
