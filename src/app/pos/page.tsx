"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, LayoutDashboardIcon, Search, ShoppingCart, X, Plus, Minus, User, CreditCard, Loader2Icon, BanknoteIcon, DoorOpenIcon, DoorClosedIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCart, type CartItem } from "@/hooks/use-cart"
import { toast } from "sonner"
import { DenominationCounter, calcDenomTotal, type DenomState } from "@/components/denomination-counter"

interface CatalogItem {
  id: string; name: string; category_id: string | null; sell_by: "weight" | "unit";
  stock_qty: number; min_stock: number; tax_rate_id: string | null;
  tax_rate: number; discount_eligible: boolean; stock_status: string;
  units: { id: string; name: string; base_qty: number; price: number; min_qty: number; is_default: boolean }[];
  default_price: number;
}
interface Category { id: string; name: string; sort_order: number }
interface CustomerResult { id: string; name: string; contact?: string; balance?: number }

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

  // Receipt preview state
  const [receiptData, setReceiptData] = useState<any>(null)
  const [receiptModal, setReceiptModal] = useState(false)

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

  // Shift state
  const [shift, setShift] = useState<any>(null)
  const [shiftLoading, setShiftLoading] = useState(true)
  const [shiftOpenModal, setShiftOpenModal] = useState(false)
  const [shiftCloseModal, setShiftCloseModal] = useState(false)
  const [shiftOpenDenoms, setShiftOpenDenoms] = useState<DenomState>({})
  const [shiftOpenTotal, setShiftOpenTotal] = useState(0)
  const [shiftCloseDenoms, setShiftCloseDenoms] = useState<DenomState>({})
  const [shiftCloseTotal, setShiftCloseTotal] = useState(0)
  const [shiftCloseNote, setShiftCloseNote] = useState("")
  const [shiftSaving, setShiftSaving] = useState(false)

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

  // Load current shift
  function loadShift() {
    return fetch("/api/shifts").then(r => r.json()).then(d => {
      setShift(d.shift ?? null)
      setShiftLoading(false)
    }).catch(() => setShiftLoading(false))
  }
  useEffect(() => { loadShift() }, [])

  async function openShift() {
    if (shiftOpenTotal < 0) { toast.error("Enter opening cash"); return }
    setShiftSaving(true)
    const res = await fetch("/api/shifts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opening_cash: shiftOpenTotal, opening_denoms: shiftOpenDenoms }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Failed to open shift"); setShiftSaving(false); return }
    toast.success(`Shift opened — starting cash ₱${shiftOpenTotal.toFixed(2)}`)
    setShiftSaving(false); setShiftOpenModal(false); setShiftOpenDenoms({}); setShiftOpenTotal(0)
    await loadShift()
  }

  async function openCloseShiftModal() {
    // Refresh shift to get latest expected cash
    await loadShift()
    setShiftCloseDenoms({}); setShiftCloseTotal(0); setShiftCloseNote("")
    setShiftCloseModal(true)
  }

  async function closeShift() {
    setShiftSaving(true)
    const res = await fetch("/api/shifts", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closing_cash: shiftCloseTotal, closing_denoms: shiftCloseDenoms, note: shiftCloseNote }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Failed to close shift"); setShiftSaving(false); return }
    const s = json.shift
    // Print close report
    printShiftReport(s)
    toast.success(`Shift closed. Variance: ${s.variance >= 0 ? "+" : ""}₱${Number(s.variance).toFixed(2)}`)
    setShiftSaving(false); setShiftCloseModal(false)
    await loadShift()
  }

  function printShiftReport(s: any) {
    const w = window.open("", "shift", "width=320,height=700")
    if (!w) return
    const denomRows = (obj: any) => Object.keys(obj || {}).filter(k => obj[k] > 0)
      .sort((a, b) => Number(b) - Number(a))
      .map(k => `<tr><td>₱${Number(k).toLocaleString()}</td><td style="text-align:center">x${obj[k]}</td><td style="text-align:right">₱${(Number(k) * obj[k]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>`).join("")
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Shift Report</title>
    <style>@page{size:80mm auto;margin:4mm}body{font-family:'Courier New',monospace;font-size:12px;width:72mm;margin:0 auto;color:#000}.c{text-align:center}.line{border-top:1px dashed #000;margin:4px 0}table{width:100%;border-collapse:collapse}td{font-size:11px;padding:1px 2px}</style>
    </head><body onload="setTimeout(()=>window.print(),300)">
      <div class="c"><strong style="font-size:14px">${user?.name ? "GroceryPOS" : "GroceryPOS"}</strong><br/><span style="font-size:10px">SHIFT CASH REPORT</span></div>
      <div class="line"></div>
      <div style="font-size:10px">Cashier: ${user?.name || ""}<br/>Opened: ${new Date(s.opened_at).toLocaleString("en-PH")}<br/>Closed: ${new Date(s.closed_at).toLocaleString("en-PH")}</div>
      <div class="line"></div>
      <table>
        <tr><td>Opening Cash</td><td></td><td style="text-align:right">₱${Number(s.opening_cash).toFixed(2)}</td></tr>
        <tr><td>Cash Sales</td><td></td><td style="text-align:right">₱${Number(s.cash_sales).toFixed(2)}</td></tr>
        <tr><td>Cash Collections</td><td></td><td style="text-align:right">₱${Number(s.cash_collections).toFixed(2)}</td></tr>
        <tr><td colspan="2"><strong>Expected Cash</strong></td><td style="text-align:right"><strong>₱${Number(s.expected_cash).toFixed(2)}</strong></td></tr>
        <tr><td colspan="2"><strong>Counted Cash</strong></td><td style="text-align:right"><strong>₱${Number(s.closing_cash).toFixed(2)}</strong></td></tr>
        <tr><td colspan="2"><strong>VARIANCE</strong></td><td style="text-align:right"><strong>${s.variance >= 0 ? "+" : ""}₱${Number(s.variance).toFixed(2)}</strong></td></tr>
      </table>
      <div class="line"></div>
      <div class="c" style="font-size:10px"><strong>CLOSING DENOMINATIONS</strong></div>
      <table>${denomRows(s.closing_denoms)}</table>
      <div class="line"></div>
      ${s.note ? `<div style="font-size:10px">Note: ${s.note}</div>` : ""}
      <div class="c" style="font-size:10px;margin-top:8px">— End of Shift —</div>
    </body></html>`)
    w.document.close()
  }

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
    if (!shift) { toast.error("Open a shift first before selling"); setShiftOpenModal(true); return }
    const d = item.units.find(u => u.is_default) ?? item.units[0]
    setUpItem(item); setUpUnit(d?.id ?? ""); setUpQty("1")
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
    if (!shift) { toast.error("Open a shift first before selling"); setShiftOpenModal(true); return }
    setPayCash(String(cart.total.toFixed(2)))
    setPayGcash("0")
    setPayModal(true)
  }

  async function processPayment() {
    const cash = Math.round((Number(payCash) || 0) * 100) / 100
    const gcash = Math.round((Number(payGcash) || 0) * 100) / 100
    const total = Math.round(cart.total * 100) / 100
    if (cash + gcash <= 0 && !cart.customerId) {
      toast.error("Enter a payment amount or select a customer for utang"); return
    }
    // Overpayment = change back to customer. Only record what covers the total.
    const paidTotal = cash + gcash
    const isShort = paidTotal < total
    if (isShort && !cart.customerId) {
      toast.error("Select a customer to have a balance"); return
    }
    // Allocate payments: excess from overpayment is change (not recorded)
    let remaining = total
    let cashPayment = Math.min(cash, remaining); remaining -= cashPayment
    let gcashPayment = Math.min(gcash, remaining)
    // If still short and customer exists, that's the balance
    const balance = isShort ? Math.round((total - cash - gcash) * 100) / 100 : 0
    const change = paidTotal > total ? Math.round((paidTotal - total) * 100) / 100 : 0
    // Total payments recorded = exactly what covers the sale (or less for short-pay)
    const totalPaid = cashPayment + gcashPayment
    
    setPaySaving(true)
    const payments: { method: string; amount: number }[] = []
    if (cashPayment > 0) payments.push({ method: "cash", amount: cashPayment })
    if (gcashPayment > 0) payments.push({ method: "gcash", amount: gcashPayment })

    try {
      const res = await fetch("/api/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map(i => ({ itemId: i.itemId, itemName: i.itemName, unitId: i.unitId, unitName: i.unitName, baseQty: i.baseQty, qty: i.qty, unitPrice: i.unitPrice, discountEligible: i.discountEligible })),
          payments,
          customerId: cart.customerId,
          discountType: cart.discount.type, discountValue: cart.discount.value,
          discountAmount: cart.discountAmount, discountName: cart.discount.name,
          subtotal: Math.round(cart.subtotal * 100) / 100,
          taxTotal: Math.round(cart.taxTotal * 100) / 100,
          total,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || "Sale failed"); setPaySaving(false); return }

      // Receipt — show preview modal first
      const sn = String(json.sale.sale_number).padStart(6, "0")
      const receiptText = {
        header: "GroceryPOS",
        subtitle: `Receipt #${sn}`,
        items: cart.items.map(i => ({ name: `${i.itemName} (${i.unitName})`, qty: i.qty, price: i.unitPrice * i.qty })),
        subtotal: Math.round(cart.subtotal * 100) / 100,
        discount: cart.discountAmount,
        tax: cart.taxTotal,
        total,
        paymentMethod: payments.map(p => `${p.method} ₱${p.amount}`).join(" + "),
        amountTendered: cash + gcash,
        change,
        orderNumber: sn,
        date: new Date().toLocaleString("en-PH"),
        cashier: user?.name || "Cashier",
        footer: "Salamat po! Come again!",
      }
      setReceiptData(receiptText)
      setReceiptModal(true)

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
    <div className="flex h-screen items-center justify-center rices-bg">
      <Loader2Icon className="h-8 w-8 animate-spin text-amber-400" />
    </div>
  )

  return (
    <div className="flex h-screen flex-col rices-bg">
      {/* ══ HEADER — same theme as admin shell ══ */}
      <header className="relative z-10 flex items-center justify-between border-b border-amber-700/40 bg-gradient-to-r from-stone-900/90 via-stone-900/90 to-stone-800/90 px-3 sm:px-4 py-3 text-white shrink-0 shadow-md">
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/85 to-transparent animate-gold-shimmer bg-[length:200%_100%]" />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white/15 ring-1 ring-amber-500/40 overflow-hidden">
            <img src="/logo.png" alt="GroceryPOS" className="h-full w-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="hidden sm:block text-sm sm:text-base font-bold leading-tight tracking-tight truncate">GroceryPOS</h1>
            <p className="hidden sm:block text-[0.6rem] sm:text-[0.7rem] font-medium text-amber-300 leading-tight">Point of Sale</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {shift ? (
            <button onClick={openCloseShiftModal} className="flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/15 px-3 py-1 text-xs font-medium text-green-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all" title="Close Shift">
              <DoorClosedIcon className="h-3.5 w-3.5" /> Shift Open · Close
            </button>
          ) : (
            <button onClick={() => { setShiftOpenDenoms({}); setShiftOpenTotal(0); setShiftOpenModal(true) }} className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/25 transition-all">
              <DoorOpenIcon className="h-3.5 w-3.5" /> Open Shift
            </button>
          )}
          <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 sm:px-3 py-1">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-extrabold text-stone-900">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-amber-200 truncate max-w-[80px]">{user.name}</span>
          </div>
          {user.role === "admin" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-300 hover:bg-amber-400/20 hover:text-amber-200" onClick={() => router.push("/dashboard")}>
              <LayoutDashboardIcon className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400" onClick={() => { setCollModal(true); setCollSearch(""); setCollResults([]) }} title="Collections">
            <BanknoteIcon className="h-4 w-4" />
          </Button>
          <button onClick={handleLogout} className="rounded-full border border-amber-500/30 bg-amber-500/15 p-2 text-amber-300 hover:bg-red-500/30 hover:text-white transition-all" title="Logout">
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ══ PRODUCT GRID ══ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -transtone-y-1/2 h-4 w-4 text-stone-500" />
              <Input ref={searchRef} placeholder="Search or scan barcode..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-stone-800 border-amber-600/30 text-white h-9" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button onClick={() => setActiveCat("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat==="all"?"bg-amber-600 text-white":"bg-stone-800 text-stone-400 hover:text-white"}`}>All</button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCat===c.id?"bg-amber-600 text-white":"bg-stone-800 text-stone-400 hover:text-white"}`}>{c.name}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-stone-500">Loading catalog...</div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filtered.map(item => (
                  <button key={item.id} onClick={() => openUnitPicker(item)} disabled={item.stock_status==="out"}
                    className={`relative flex flex-col items-center p-3 rounded-xl border transition-all text-left ${item.stock_status==="out"?"bg-stone-900/50 border-amber-600/30 opacity-50 cursor-not-allowed":"bg-stone-800/60 border-amber-600/30 hover:border-amber-500 hover:bg-stone-800 cursor-pointer"}`}>
                    {item.stock_status==="out"&&<Badge className="absolute top-1 right-1 text-[10px] bg-red-600">OUT</Badge>}
                    {item.stock_status==="low"&&<Badge className="absolute top-1 right-1 text-[10px] bg-yellow-600">LOW</Badge>}
                    <div className="h-10 w-10 rounded-lg bg-stone-700 flex items-center justify-center mb-2">
                      <span className="text-lg">{item.sell_by==="weight"?"⚖":"📦"}</span>
                    </div>
                    <span className="text-xs font-medium text-white text-center leading-tight line-clamp-2">{item.name}</span>
                    <span className="text-xs text-amber-400 mt-1 font-semibold">₱{Number(item.default_price).toFixed(2)}</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Stock: {Number(item.stock_qty).toFixed(item.sell_by==="weight"?1:0)}</span>
                  </button>
                ))}
                {filtered.length===0&&<div className="col-span-full text-center text-stone-500 py-12">No products found</div>}
              </div>
            </div>
          )}
        </div>

        {/* ══ CART SIDEBAR ══ */}
        <div className={`${showCart?"fixed inset-0 z-40":"hidden"} lg:relative lg:flex lg:z-0 w-full lg:w-[380px] flex-col border-l border-amber-600/30 bg-stone-900/60 shrink-0`}>
          <div className="flex items-center justify-between p-3 border-b border-amber-600/30">
            <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-amber-400"/><span className="font-semibold text-white text-sm">Cart ({cart.items.length})</span></div>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={()=>setShowCart(false)}><X className="h-4 w-4"/></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {cart.items.length===0?<div className="text-center text-stone-500 py-8 text-sm">Cart is empty</div>:cart.items.map(item=>{const k=cart.mergeKey(item);return(
              <div key={k} className="flex items-center gap-2 bg-stone-800/50 rounded-lg p-2">
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-white truncate">{item.itemName}</p><p className="text-[10px] text-stone-400">{item.unitName} · ₱{Number(item.unitPrice).toFixed(2)}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>cart.updateQty(k,item.qty-(item.sellBy==="weight"?0.1:1))} className="h-6 w-6 rounded bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white"><Minus className="h-3 w-3"/></button>
                  <span className="text-xs font-medium text-white w-10 text-center">{item.sellBy==="weight"?Number(item.qty).toFixed(item.qty%1===0?1:3):item.qty}</span>
                  <button onClick={()=>cart.updateQty(k,item.qty+(item.sellBy==="weight"?0.1:1))} className="h-6 w-6 rounded bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white"><Plus className="h-3 w-3"/></button>
                </div>
                <button onClick={()=>cart.removeItem(k)} className="h-6 w-6 rounded flex items-center justify-center text-stone-500 hover:text-red-400"><X className="h-3 w-3"/></button>
              </div>
            )})}
          </div>
          <div className="border-t border-amber-600/30 p-3 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Discount:</span>
              <Select value={cart.discount.type??"none"} onValueChange={v=>{if(v==="none")cart.setDiscount({type:null,value:0,name:""});else if(v==="senior")cart.setDiscount({type:"senior",value:20,name:"Senior 20%"});else if(v==="pwd")cart.setDiscount({type:"pwd",value:20,name:"PWD 20%"})}}>
                <SelectTrigger className="h-7 text-xs w-[140px] bg-stone-800 border-amber-600/30"><SelectValue placeholder="No Discount"/></SelectTrigger>
                <SelectContent>{discountOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Customer:</span>
              {cart.customerId?<button onClick={openCustomerSearch} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"><User className="h-3 w-3"/>{cart.customerName}{cart.customerBalance>0&&<span className="text-yellow-400">(utang: ₱{cart.customerBalance.toFixed(2)})</span>}</button>:<button onClick={openCustomerSearch} className="text-xs text-stone-500 hover:text-white">Walk-in ▾</button>}
            </div>
            <div className="space-y-0.5 text-xs border-t border-amber-600/30 pt-2">
              <div className="flex justify-between text-stone-400"><span>Subtotal</span><span>₱{cart.subtotal.toFixed(2)}</span></div>
              {cart.discountAmount>0&&<div className="flex justify-between text-red-400"><span>{cart.discount.name}</span><span>-₱{cart.discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-stone-400"><span>Tax</span><span>₱{cart.taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold text-white pt-1"><span>TOTAL</span><span>₱{cart.total.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-2"><Button variant="outline" size="sm" className="flex-1" onClick={cart.clearCart} disabled={cart.items.length===0}>Clear</Button>
              <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-500" disabled={cart.items.length===0} onClick={openPay}><CreditCard className="h-3 w-3 mr-1"/>Pay</Button></div>
          </div>
        </div>

        {/* Mobile cart toggle */}
        <button onClick={()=>setShowCart(true)} className="lg:hidden fixed bottom-4 right-4 z-30 h-14 w-14 rounded-full bg-amber-600 text-white shadow-lg flex items-center justify-center">
          <ShoppingCart className="h-6 w-6"/>{cart.items.length>0&&<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">{cart.items.length}</span>}
        </button>
      </div>

      {/* ══ UNIT PICKER ══ */}
      <Dialog open={!!upItem} onOpenChange={()=>setUpItem(null)}>
        <DialogContent className="max-w-sm bg-stone-900/60 border-amber-600/30 text-white p-5">
          <DialogHeader><DialogTitle>{upItem?.name}</DialogTitle></DialogHeader>
          {upItem&&(<div className="space-y-5">
            <p className="text-xs text-stone-400">Available: {Number(upItem.stock_qty).toFixed(upItem.sell_by==="weight"?1:0)} {upItem.sell_by==="weight"?"kg":"pcs"}</p>
            <div className="space-y-1.5">
              {upItem.units.map(u=>(<label key={u.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${upUnit===u.id?"border-amber-500 bg-amber-500/10":"border-amber-600/30 bg-stone-800"}`}>
                <input type="radio" name="unit" value={u.id} checked={upUnit===u.id} onChange={()=>{setUpUnit(u.id);setUpQty(String(u.min_qty??(upItem.sell_by==="weight"?0.001:1)))}} className="accent-amber-500"/>
                <div className="flex-1"><span className="text-sm font-medium">{u.name}</span><span className="text-xs text-stone-400 ml-2">({u.base_qty} {upItem.sell_by==="weight"?"kg":"pc"} base)</span></div>
                <span className="text-sm font-bold text-amber-400">₱{Number(u.price).toFixed(2)}</span>
              </label>))}
            </div>
            <div className="space-y-1.5 mb-1">
              <span className="text-xs font-medium text-stone-400 mb-1">Quantity:</span>
              <Input type="number" value={upQty} onChange={e=>setUpQty(e.target.value)}
                step={upItem.sell_by==="weight"?"0.1":"1"} min={upItem.units.find(u=>u.id===upUnit)?.min_qty??(upItem.sell_by==="weight"?0.001:1)}
                className="bg-stone-800 border-amber-600/30 h-10 text-sm"/>
            </div>
            {upUnit&&(<p className="text-xs text-stone-500">Total: {(Number(upQty||0)*(upItem.units.find(u=>u.id===upUnit)?.base_qty??1)).toFixed(upItem.sell_by==="weight"?1:0)} {upItem.sell_by==="weight"?"kg":"pcs"} = ₱{(Number(upQty||0)*(upItem.units.find(u=>u.id===upUnit)?.price??0)).toFixed(2)}</p>)}
            <Button onClick={addToCart} className="w-full bg-amber-600 hover:bg-amber-500">Add to Cart</Button>
          </div>)}
        </DialogContent>
      </Dialog>

      {/* ══ CUSTOMER SEARCH ══ */}
      <Dialog open={custModal} onOpenChange={setCustModal}>
        <DialogContent className="max-w-sm bg-stone-900/60 border-amber-600/30 text-white p-5"><DialogHeader><DialogTitle>Select Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Search customer..." value={custSearch} onChange={e=>searchCustomers(e.target.value)} className="bg-stone-800 border-amber-600/30"/>
            <button onClick={()=>{cart.setCustomer(null,"",0);setCustModal(false)}} className="w-full text-left p-2 rounded bg-stone-800 text-sm text-stone-400 hover:bg-stone-700">Walk-in (no customer)</button>
            {custResults.map(c=>(<button key={c.id} onClick={()=>{cart.setCustomer(c.id,c.name,c.balance??0);setCustModal(false)}} className="w-full text-left p-2 rounded bg-stone-800 text-sm hover:bg-stone-700">
               <div className="font-medium text-white">{c.name}</div><div className="text-xs text-stone-400">{c.contact ? `${c.contact}` : ""}</div>
              {c.balance!==undefined&&c.balance>0&&<div className="text-xs text-yellow-400">Utang: ₱{c.balance.toFixed(2)}</div>}
            </button>))}
          </div></DialogContent>
      </Dialog>

      {/* ══ PAYMENT OVERLAY ══ */}
      <Dialog open={payModal} onOpenChange={setPayModal}>
        <DialogContent className="max-w-sm bg-stone-900/60 border-amber-600/30 text-white p-5">
          <DialogHeader><DialogTitle>Payment</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <p className="text-center"><span className="text-3xl font-bold text-white">₱{cart.total.toFixed(2)}</span></p>
            <div className="space-y-3">
              <div className="space-y-1.5 mb-1">
                <label className="text-xs font-medium text-stone-400 mb-1">Cash</label>
                <Input type="number" step="0.01" value={payCash} onChange={e=>setPayCash(e.target.value)} className="bg-stone-800 border-amber-600/30 h-10"/>
              </div>
              <div className="space-y-1.5 mb-1">
                <label className="text-xs font-medium text-stone-400 mb-1">GCash</label>
                <Input type="number" step="0.01" value={payGcash} onChange={e=>setPayGcash(e.target.value)} className="bg-stone-800 border-amber-600/30 h-10"/>
              </div>
              <div className="border-t border-amber-600/30 pt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-stone-400">Paid</span><span className="text-white font-semibold">₱{((Number(payCash)||0)+(Number(payGcash)||0)).toFixed(2)}</span></div>
                {((Number(payCash)||0)+(Number(payGcash)||0))<cart.total&&(<div className="flex justify-between"><span className="text-yellow-400">To Balance</span><span className="text-yellow-400 font-semibold">₱{(cart.total-(Number(payCash)||0)-(Number(payGcash)||0)).toFixed(2)}</span></div>)}
                {(Number(payCash)||0)>cart.total&&(<div className="flex justify-between"><span className="text-amber-400">Change</span><span className="text-amber-400 font-semibold">₱{((Number(payCash)||0)-cart.total).toFixed(2)}</span></div>)}
              </div>
              {cart.customerId&&<div className="text-xs text-stone-400">Customer: {cart.customerName} {cart.customerBalance>0?`(existing utang: ₱${cart.customerBalance.toFixed(2)})`:""}</div>}
              {!cart.customerId&&((Number(payCash)||0)+(Number(payGcash)||0))<cart.total&&<p className="text-xs text-red-400 text-center">Select a customer to have a balance</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={()=>setPayModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-500" onClick={processPayment} disabled={paySaving}>{paySaving?<Loader2Icon className="h-4 w-4 animate-spin"/>:"Confirm Payment"}</Button>
            </div>
          </div></DialogContent>
      </Dialog>

      {/* ══ RECEIPT PREVIEW MODAL ══ */}
      <Dialog open={receiptModal} onOpenChange={setReceiptModal}>
        <DialogContent className="max-w-sm bg-white text-black font-mono text-sm p-6">
          {receiptData && (
            <div className="space-y-4 text-[13px]">
              {/* Store header */}
              <div className="text-center border-b border-dashed border-gray-300 pb-2">
                <p className="font-bold text-base">{receiptData.header}</p>
                <p className="text-[11px] text-gray-500">{receiptData.subtitle}</p>
              </div>

              {/* Order info */}
              <div className="text-[11px] space-y-0.5">
                <div className="flex justify-between"><span>Receipt #:</span><span className="font-semibold">{receiptData.orderNumber}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{receiptData.date}</span></div>
                <div className="flex justify-between"><span>Cashier:</span><span>{receiptData.cashier}</span></div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2" />

              {/* Items */}
              <table className="w-full text-[12px]">
                <tbody>
                  {receiptData.items.map((i: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-0.5">{i.name}</td>
                      <td className="text-center py-0.5">x{i.qty}</td>
                      <td className="text-right py-0.5">₱{i.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-300 pt-1" />

              {/* Totals */}
              <div className="space-y-0.5 text-[12px]">
                <div className="flex justify-between"><span>Subtotal</span><span>₱{receiptData.subtotal.toFixed(2)}</span></div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Discount</span><span>-₱{receiptData.discount.toFixed(2)}</span></div>
                )}
                {receiptData.tax > 0 && (
                  <div className="flex justify-between"><span>Tax</span><span>₱{receiptData.tax.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>TOTAL</span><span>₱{receiptData.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-1" />

              {/* Payment */}
              <div className="text-[12px] space-y-0.5">
                <span>{receiptData.paymentMethod}</span>
                {receiptData.amountTendered > 0 && (
                  <div className="flex justify-between"><span>Tendered</span><span>₱{receiptData.amountTendered.toFixed(2)}</span></div>
                )}
                {receiptData.change > 0 && (
                  <div className="flex justify-between"><span>Change</span><span>₱{receiptData.change.toFixed(2)}</span></div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2" />

              {/* Footer */}
              <p className="text-center text-[11px]">{receiptData.footer}</p>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 text-black border-gray-300" onClick={async () => {
                  try {
                    const { printReceipt } = await import("@/lib/utils/printer")
                    await printReceipt(receiptData)
                    toast.success("Receipt printing...")
                  } catch { toast.error("Print failed — try Reprint from Sales History") }
                }}>
                  Print
                </Button>
                <Button className="flex-1 bg-stone-800 hover:bg-stone-700 text-white" onClick={() => { setReceiptModal(false); setReceiptData(null) }}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ OPEN SHIFT MODAL ══ */}
      <Dialog open={shiftOpenModal} onOpenChange={setShiftOpenModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-stone-900/60 border-amber-600/30 text-white p-5">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DoorOpenIcon className="h-5 w-5 text-amber-400" /> Open Shift — Count Starting Cash</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <p className="text-xs text-stone-400">Count the cash in the drawer before you start selling. Enter how many pieces of each denomination.</p>
            <DenominationCounter value={shiftOpenDenoms} onChange={(d, t) => { setShiftOpenDenoms(d); setShiftOpenTotal(t) }} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShiftOpenModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-500" onClick={openShift} disabled={shiftSaving}>
                {shiftSaving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : `Open Shift (₱${shiftOpenTotal.toFixed(2)})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ CLOSE SHIFT MODAL ══ */}
      <Dialog open={shiftCloseModal} onOpenChange={setShiftCloseModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-stone-900/60 border-amber-600/30 text-white p-5">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DoorClosedIcon className="h-5 w-5 text-amber-400" /> Close Shift — Count Cash</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {shift && (
              <div className="rounded-lg bg-stone-800/60 border border-amber-600/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between text-stone-400"><span>Opening Cash</span><span>₱{Number(shift.opening_cash).toFixed(2)}</span></div>
                <div className="flex justify-between text-stone-400"><span>Cash Sales</span><span>₱{Number(shift.cash_sales).toFixed(2)}</span></div>
                <div className="flex justify-between text-stone-400"><span>Cash Collections</span><span>₱{Number(shift.cash_collections).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-amber-300 border-t border-amber-600/30 pt-1"><span>Expected in Drawer</span><span>₱{Number(shift.expected_cash).toFixed(2)}</span></div>
              </div>
            )}
            <p className="text-xs text-stone-400">Now count the actual cash in the drawer:</p>
            <DenominationCounter value={shiftCloseDenoms} onChange={(d, t) => { setShiftCloseDenoms(d); setShiftCloseTotal(t) }} />
            {shift && (
              <div className={`rounded-lg p-2 text-center text-sm font-semibold ${(shiftCloseTotal - Number(shift.expected_cash)) === 0 ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                Variance: {(shiftCloseTotal - Number(shift.expected_cash)) >= 0 ? "+" : ""}₱{(shiftCloseTotal - Number(shift.expected_cash)).toFixed(2)}
                {(shiftCloseTotal - Number(shift.expected_cash)) > 0 ? " (over)" : (shiftCloseTotal - Number(shift.expected_cash)) < 0 ? " (short)" : " (balanced)"}
              </div>
            )}
            <Input placeholder="Note (optional)" value={shiftCloseNote} onChange={e => setShiftCloseNote(e.target.value)} className="bg-stone-800 border-amber-600/30 h-10" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShiftCloseModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-500" onClick={closeShift} disabled={shiftSaving}>
                {shiftSaving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Close Shift & Print"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ COLLECTIONS MODAL ══ */}
      <Dialog open={collModal} onOpenChange={setCollModal}>
        <DialogContent className="max-w-sm bg-stone-900/60 border-amber-600/30 text-white p-5">
          <DialogHeader><DialogTitle>Collections (Utang Payment)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!collSelected ? (
              <>
                <Input placeholder="Search customer..." value={collSearch} onChange={e => {
                  setCollSearch(e.target.value)
                  if (e.target.value.length < 1) { setCollResults([]); return }
                  fetch(`/api/backoffice/customers?q=${encodeURIComponent(e.target.value)}`).then(r => r.json()).then(d => setCollResults(d.customers ?? []))
                }} className="bg-stone-800 border-amber-600/30 h-10" />
                {collResults.map((c: any) => (
                  <button key={c.id} onClick={() => setCollSelected({ id: c.id, name: c.name, balance: c.balance ?? 0 })}
                    className="w-full text-left p-2 rounded bg-stone-800 text-sm hover:bg-stone-700">
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-xs text-yellow-400">Utang: ₱{(c.balance ?? 0).toFixed(2)}</div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="p-3 rounded bg-stone-800">
                  <p className="text-sm font-medium">{collSelected.name}</p>
                  <p className="text-xl font-bold text-yellow-400">Balance: ₱{collSelected.balance.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" placeholder="Amount" value={collAmount} onChange={e => setCollAmount(e.target.value)} className="bg-stone-800 border-amber-600/30 flex-1 h-10" />
                  <Select value={collMethod} onValueChange={v => setCollMethod(v ?? "cash")}>
                    <SelectTrigger className="w-28 bg-stone-800 border-amber-600/30 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="gcash">GCash</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setCollSelected(null); setCollAmount(""); setCollModal(false) }}>Cancel</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-500"
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
