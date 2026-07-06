"use client"

import { useState, useMemo, useEffect } from "react"
import { useCart } from "@/hooks/use-cart"
import { useCatalog } from "@/hooks/use-catalog"
import { CartContext } from "./_components/cart-context"
import { useRouter } from "next/navigation"
import { PaymentOverlay } from "./_components/payment-overlay"
import { OpenShiftModal } from "@/components/shifts/open-shift-modal"
import { CloseShiftModal } from "@/components/shifts/close-shift-modal"
import { VariantSelector } from "@/components/variant-selector"
import { toast } from "sonner"
import {
  SearchIcon, ShoppingBagIcon, Loader2Icon, LogOutIcon,
  LayoutDashboardIcon, StoreIcon, PackageIcon, TrendingUpIcon,
  ShoppingCartIcon, XIcon, ClipboardListIcon, Clock, MonitorIcon
} from "lucide-react"

const formatCurrency = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`

export default function PosPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [user, setUser] = useState<{ name: string; role: string; employeeId: string } | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)
  const [shiftOpenedAt, setShiftOpenedAt] = useState<string | null>(null)
  const [shiftOpenModal, setShiftOpenModal] = useState(false)
  const [shiftCloseModal, setShiftCloseModal] = useState(false)
  const [shiftLoading, setShiftLoading] = useState(true)
  const [variantOpen, setVariantOpen] = useState(false)
  const [variantProduct, setVariantProduct] = useState<{ id: string; name: string } | null>(null)
  const [variantOptions, setVariantOptions] = useState<{ id: string; sizeLabel: string; price: number }[]>([])
  const [now, setNow] = useState(Date.now())
  const cart = useCart()
  const { items, categories, variants, searchItems } = useCatalog()
  const router = useRouter()

  const handleItemClick = (item: typeof items[0]) => {
    const taxRate = item.taxRateId ? 12 : 0
    const productVariants = variants.filter(v => v.productId === item.id)
    if (productVariants.length > 1) {
      setVariantProduct({ id: item.id, name: item.name })
      setVariantOptions(productVariants)
      setVariantOpen(true)
    } else if (productVariants.length === 1) {
      cart.addItem({ id: item.id, name: item.name, unitPrice: productVariants[0].price, taxRate, variantId: productVariants[0].id })
    } else {
      cart.addItem({ id: item.id, name: item.name, unitPrice: item.price, taxRate })
    }
  }

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) {
        setUser({ name: d.employee.name, role: d.employee.role, employeeId: d.employee.id })
        if (d.employee.role === "admin") {
          setShiftLoading(false)
        } else {
          fetch("/api/shifts").then(r => r.json()).then(sd => {
            if (sd.active) {
              setActiveShiftId(sd.active.id)
              setShiftOpenedAt(sd.active.opened_at || new Date().toISOString())
            } else {
              setShiftOpenModal(true)
            }
            setShiftLoading(false)
          }).catch(() => setShiftLoading(false))
        }
      } else {
        document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login")
      }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  // Sync cart to customer display
  useEffect(() => {
    if (cart.items.length === 0) {
      fetch("/api/pos/cart/display", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [], subtotal: 0, taxTotal: 0, total: 0, status: "active" }),
      }).catch(() => {})
    }
  }, [cart.items.length === 0])

  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/pos/cart/display", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.unitPrice })),
          subtotal: cart.totals.subtotal,
          taxTotal: cart.totals.taxTotal,
          total: cart.totals.total,
          status: "active",
        }),
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(t)
  }, [cart.items, cart.totals])

  useEffect(() => {
    if (!activeShiftId) return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [activeShiftId])

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  const searchResults = useMemo(() => searchItems(search), [searchItems, search])
  const filteredItems = useMemo(() => {
    const pool = search ? searchResults : items
    const visible = pool.filter(i => i.price > 0)
    const result = activeCategory ? visible.filter(i => i.categoryId === activeCategory) : visible
    return result.sort((a, b) => {
      const catA = categories.find(c => c.id === a.categoryId)?.sortOrder ?? 99
      const catB = categories.find(c => c.id === b.categoryId)?.sortOrder ?? 99
      if (catA !== catB) return catA - catB
      return a.name.localeCompare(b.name)
    })
  }, [items, activeCategory, search, searchResults, categories])

  const COLORS = ["#10b981","#f59e0b","#3b82f6","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"]

  if (!user) return null

  // Shared cart content component
  const CartContent = () => (<>
    <div className="flex items-center justify-between border-b-2 border-brewhas-700/50 px-4 py-3 bg-brewhas-900/60 backdrop-blur-sm">
      <span className="text-sm font-bold text-gold-300 flex items-center gap-2">
        <ShoppingCartIcon className="h-4 w-4 text-gold-300" />
        Cart
      </span>
      {(cart.itemCount > 0) && (
        <span className="rounded-full bg-gold-400/40 px-2.5 py-0.5 text-xs font-bold text-gold-300">{cart.itemCount}</span>
      )}
    </div>

    {cart.items.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-500">
        <ShoppingBagIcon className="h-8 w-8" />
        <p className="text-sm">Cart is empty</p>
      </div>
    ) : (
      <>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {cart.items.map((item, i) => (
            <div key={i} className="rounded-xl border-2 border-brewhas-700/40 bg-brewhas-900/40 backdrop-blur-sm p-2.5 shadow-sm hover:border-gold-400/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium text-white">{item.name}</span>
                <button onClick={() => cart.removeItem(i)} className="ml-1 rounded-full p-0.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => cart.updateQty(i, item.qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-brewhas-600/50 text-sm text-slate-400 hover:border-gold-400/60 hover:bg-gold-400/25 hover:text-gold-300 transition-colors">−</button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-white">{item.qty}</span>
                  <button onClick={() => cart.updateQty(i, item.qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-brewhas-600/50 text-sm text-slate-400 hover:border-gold-400/60 hover:bg-gold-400/25 hover:text-gold-300 transition-colors">+</button>
                </div>
                <span className="text-sm font-bold tabular-nums text-gold-300">{formatCurrency(item.unitPrice * item.qty)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-sm p-4 space-y-2">
          {/* Discount Selector */}
          <div className="flex gap-1.5">
            {[
              { label: "None", type: undefined as any, value: 0 },
              { label: "Senior 20%", type: "percentage", value: 20 },
              { label: "PWD 20%", type: "percentage", value: 20 },
            ].map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d.type) cart.setDiscount({ type: d.type, value: d.value })
                  else cart.setDiscount(undefined)
                }}
                className={`flex-1 rounded-full px-2 py-1 text-[0.65rem] font-bold transition-all ${(cart.discount?.value === d.value && cart.discount?.type === d.type) ? "bg-red-600 text-white" : cart.discount === undefined && d.type === undefined ? "bg-gold-500 text-brewhas-950" : "border border-brewhas-600/50 text-slate-400 hover:border-red-400/50"}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium text-white">{formatCurrency(cart.totals.subtotal)}</span>
          </div>
          {cart.totals.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-red-400">
              <span>Discount</span>
              <span className="tabular-nums font-medium">−{formatCurrency(cart.totals.discountAmount)}</span>
            </div>
          )}
          {cart.totals.taxBreakdown.map((tb, i) => (
            <div key={i} className="flex justify-between text-xs text-slate-400">
              <span>Tax ({tb.rate}%)</span>
              <span className="tabular-nums font-medium text-white">{formatCurrency(tb.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-brewhas-700/50 pt-2.5 text-base font-bold">
            <span className="text-white">Total</span>
            <span className="tabular-nums text-gold-300">{formatCurrency(cart.totals.total)}</span>
          </div>
          <button
            disabled={cart.items.length === 0}
            onClick={() => { setPaymentOpen(true); setMobileCartOpen(false) }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-500 font-semibold text-brewhas-950 shadow-lg shadow-gold-500/45 transition-all hover:bg-gold-400 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-gold-shimmer before:bg-[length:200%_100%] before:pointer-events-none"
          >
            Charge {formatCurrency(cart.totals.total)}
          </button>
          <button onClick={cart.clearCart} className="w-full text-xs text-slate-500 hover:text-red-400 transition-colors">
            Clear cart
          </button>
        </div>
      </>
    )}
  </>)

  const shiftDuration = shiftOpenedAt ? (() => {
    const diff = now - new Date(shiftOpenedAt).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })() : ""

  return (
    <CartContext.Provider value={cart}>
      <div className="relative flex h-screen flex-col">{/* BG image */}<div className="pointer-events-none absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center bg-no-repeat z-0" />{/* Overlay */}<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brewhas-950/85 via-brewhas-900/75 to-brewhas-950/85 z-0" />
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b-2 border-gold-500/50 bg-gradient-to-r from-brewhas-700 via-brewhas-700 to-brewhas-800 px-3 sm:px-4 py-3 text-white shrink-0 shadow-md">
          {/* Gold shimmer line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/85 to-transparent animate-gold-shimmer bg-[length:200%_100%]" />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-white/25 ring-1 ring-gold-400/85 overflow-hidden">
              <img src="/logo.png" alt="Brewhas" className="h-full w-full object-contain p-0.5" />
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm sm:text-base font-bold leading-tight tracking-tight truncate">Brewhas Coffeehouse</h1>
              <p className="text-[0.6rem] sm:text-[0.7rem] font-medium text-gold-300 leading-tight">Point of Sale</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-gold-400/40 bg-gold-400/25 px-2 sm:px-3 py-1 sm:py-1.5">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-gold-500 text-[0.6rem] sm:text-xs font-extrabold text-brewhas-950">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-gold-200 truncate max-w-[80px]">{user.name}</span>
            </div>
            {activeShiftId && user?.role === "cashier" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gold-400/25 border border-gold-400/50 px-2.5 py-1 text-[0.65rem] font-bold text-gold-300">
                <Clock className="h-3 w-3" /> {shiftDuration}
              </span>
            )}
            {user.role === "admin" && (
              <button onClick={() => router.push("/dashboard")} className="rounded-full p-2 text-gold-300 hover:bg-gold-400/25 hover:text-gold-200 transition-colors" title="Dashboard">
                <LayoutDashboardIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => {
                const url = `${window.location.origin}/display`
                navigator.clipboard.writeText(url).then(() => toast.success("Display link copied! Open on customer tablet.", { duration: 3000 })).catch(() => toast.info(url))
              }}
              className="rounded-full p-2 text-gold-300 hover:bg-gold-400/25 hover:text-gold-200 transition-colors"
              title="Copy customer display link"
            >
              <MonitorIcon className="h-5 w-5" />
            </button>
            <button onClick={handleLogout} className="rounded-full border border-gold-400/40 bg-gold-400/25 p-2 text-gold-300 hover:bg-red-500/30 hover:text-white transition-all" title="Logout">
              <LogOutIcon className="h-5 w-5" />
            </button>
            {activeShiftId && user?.role === "cashier" && (
              <button onClick={() => setShiftCloseModal(true)} className="rounded-full border border-gold-400/40 bg-gold-400/25 p-2 text-gold-300 hover:bg-white/25 hover:text-white transition-all" title="End Shift">
                <ClipboardListIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="bg-brewhas-900/60 backdrop-blur-sm px-4 pt-3 pb-2 border-b-2 border-brewhas-700/50">
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-300/90" />
                <input
                  placeholder="Search items..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border-2 border-brewhas-700/50 bg-brewhas-900 pl-10 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-gold-300/70 focus:border-gold-300/60 focus:ring-4 focus:ring-gold-300/25 focus:bg-brewhas-800"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto border-b-2 border-brewhas-700/50 bg-brewhas-900/40 backdrop-blur-sm px-4 py-2.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 rounded-full px-5 py-1.5 text-xs font-bold tracking-wide transition-all duration-200 ${!activeCategory ? "bg-gold-500 text-brewhas-950 shadow-lg shadow-gold-500/45 animate-gold-pulse" : "border-2 border-brewhas-700/50 bg-brewhas-800/50 text-gold-300 hover:bg-brewhas-700/50"}`}
              >
                All
              </button>
              {categories.sort((a,b) => a.sortOrder - b.sortOrder).filter(cat => items.some(i => i.categoryId === cat.id && i.price > 0)).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-5 py-1.5 text-xs font-bold tracking-wide transition-all duration-200 ${activeCategory === cat.id ? "bg-gold-500 text-brewhas-950 shadow-lg shadow-gold-500/45 animate-gold-pulse" : "border-2 border-brewhas-700/50 bg-brewhas-800/50 text-gold-300 hover:bg-brewhas-700/50"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Item Grid */}
            {filteredItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brewhas-800/50">
                  <ShoppingBagIcon className="h-8 w-8 text-gold-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400">No items found</p>
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-4 content-start">
                {filteredItems.map(item => {
                  const outOfStock = item.trackStock && item.stockQty <= 0
                  const isLow = item.trackStock && item.stockQty <= item.minStock && item.stockQty > 0
                  const colorIdx = item.name.length % COLORS.length
                  return (
                    <button
                      key={item.id}
                      disabled={outOfStock}
                      onClick={() => handleItemClick(item)}
                       className={`group flex flex-row rounded-2xl border-2 bg-brewhas-900/60 backdrop-blur-xl text-left ring-1 ring-gold-400/50 transition-all duration-200 shadow-md hover:shadow-xl active:scale-[0.97] overflow-hidden h-[7rem] sm:h-[8rem] ${outOfStock ? "border-brewhas-700/30 opacity-50 cursor-not-allowed" : "border-brewhas-700/50 cursor-pointer hover:border-gold-400/60 hover:-translate-y-1 hover:shadow-gold-400/40 hover:animate-gold-pulse"}`}
                    >
                      {/* Image — left half */}
                      <div className="relative w-2/5 sm:w-1/2 shrink-0 overflow-hidden bg-brewhas-950/50 h-full">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${COLORS[colorIdx]}, ${COLORS[(colorIdx+1)%COLORS.length]})` }}>
                            {item.name.charAt(0)}
                          </div>
                        )}
                        {/* Badges overlay */}
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          {isLow && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[0.6rem] font-bold text-amber-400 shadow-sm backdrop-blur">LOW</span>}
                          {outOfStock && <span className="rounded-full bg-red-400/20 px-2 py-0.5 text-[0.6rem] font-bold text-red-400 shadow-sm backdrop-blur">OUT</span>}
                        </div>
                      </div>
                      {/* Details — right half */}
                      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4 min-w-0">
                        <div>
                          <p className="truncate text-sm font-bold text-white leading-tight">{item.name}</p>
                          <p className="text-[0.65rem] font-semibold text-gold-300 mt-0.5 truncate">{categories.find(c => c.id === item.categoryId)?.name || ""}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-base sm:text-lg font-extrabold text-gold-300 tracking-tight">{formatCurrency(item.price)}</span>
                          {item.trackStock && (
                            <span className={`text-xs font-bold ${isLow ? "text-amber-400" : "text-gold-300/90"}`}>
                              {item.stockQty}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </main>

          {/* Desktop Cart */}
          <aside className="relative z-10 hidden w-80 shrink-0 flex-col border-l-2 border-brewhas-700/50 bg-brewhas-950/60 backdrop-blur-sm lg:flex">
            <CartContent />
          </aside>
        </div>

        {/* Mobile Cart Drawer */}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileCartOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 flex max-h-[70vh] animate-slide-up flex-col rounded-t-3xl border-t-2 border-brewhas-700/50 bg-brewhas-900/95 backdrop-blur-xl shadow-2xl">
              <CartContent />
            </div>
          </div>
        )}

        {/* Floating Cart Button (Mobile) */}
        {cart.items.length > 0 && !mobileCartOpen && (
          <button
            onClick={() => setMobileCartOpen(true)}
            className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500 text-brewhas-950 shadow-xl shadow-gold-500/50 lg:hidden animate-gold-pulse hover:bg-gold-400 active:scale-95 transition-all"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[0.65rem] font-bold text-white shadow">
              {cart.itemCount}
            </span>
          </button>
        )}

        {/* Bottom Nav (Mobile) */}
        <footer className="relative z-10 flex items-center justify-around border-t-2 border-brewhas-700/50 bg-brewhas-900/80 backdrop-blur-sm py-2 lg:hidden shrink-0">
          {[
            { label: "POS", icon: StoreIcon, active: true },
            ...(user?.role === "admin" ? [
              { label: "Items", icon: PackageIcon, onClick: () => router.push("/backoffice/items") },
              { label: "Sales", icon: TrendingUpIcon, onClick: () => router.push("/dashboard") },
            ] : []),
          ].map(tab => (
            <button key={tab.label} onClick={"onClick" in tab ? tab.onClick : undefined} className="flex flex-col items-center gap-1 px-4 py-1 text-[0.6rem] font-medium text-slate-400 transition-colors hover:text-gold-300">
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </footer>

        {/* Payment Overlay */}
        {paymentOpen && user && (
          <PaymentOverlay
            onClose={() => setPaymentOpen(false)}
            employeeId={user.employeeId}
            shiftId={activeShiftId}
          />
        )}

        {/* Shift Modals â€” cashier only */}
        {user?.role === "cashier" && (
          <>
            <OpenShiftModal
              open={shiftOpenModal}
              onClose={() => { setShiftOpenModal(false); if (!activeShiftId) router.push("/auth/login") }}
              onShiftOpened={(id) => { setActiveShiftId(id); setShiftOpenModal(false) }}
            />
            <CloseShiftModal
              open={shiftCloseModal}
              onClose={() => setShiftCloseModal(false)}
              shiftId={activeShiftId ?? ""}
              onShiftClosed={() => { setActiveShiftId(null); setShiftOpenModal(true) }}
            />
          </>
        )}

        {/* Variant Selector */}
        <VariantSelector
          open={variantOpen}
          onClose={() => setVariantOpen(false)}
          productName={variantProduct?.name ?? ""}
          variants={variantOptions}
          onSelect={(v) => {
            const vatRate = items.find(i => i.id === variantProduct?.id)?.taxRateId ? 12 : 0
            cart.addItem({ id: variantProduct?.id ?? "", name: `${variantProduct?.name} (${v.sizeLabel})`, unitPrice: v.price, taxRate: vatRate, variantId: v.id })
            setVariantOpen(false)
          }}
        />
      </div>
    </CartContext.Provider>
  )
}
