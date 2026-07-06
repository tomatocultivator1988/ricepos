"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Search, Plus, Minus, Boxes, X, StoreIcon, LayoutDashboardIcon, PackageIcon, BoxesIcon, UsersIcon, LogOutIcon, Loader2Icon , TrendingUpIcon, TruckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { TabsContent } from "@/components/ui/tabs"
import { DeliveryDialog } from "@/components/delivery/delivery-dialog"

type InventoryItem = {
  id: string
  name: string
  categoryName: string
  stockQty: number
  minStock: number
  trackStock: boolean
  price: number
  status: "ok" | "low" | "out"
}

type CanMakeProduct = {
  id: string
  name: string
  price: number
  canMake: number
  limitedBy: string
  recipe: { name: string; perUnit: number }[]
}

type LogEntry = {
  id: string
  itemName: string
  changeQty: number
  qtyAfter: number
  reason: string
  note: string | null
  created_at: string
}

const statusBadge = (status: InventoryItem["status"]) => {
  switch (status) {
    case "out":
      return (
        <span className="inline-flex h-5 w-fit items-center rounded-full border border-red-800/30 px-2 py-0.5 text-xs font-medium bg-red-900/40 text-red-400">
          Out of Stock
        </span>
      )
    case "low":
      return (
        <span className="inline-flex h-5 w-fit items-center rounded-full border border-amber-800/30 px-2 py-0.5 text-xs font-medium bg-amber-900/40 text-amber-400">
          Low Stock
        </span>
      )
    default:
      return (
        <span className="inline-flex h-5 w-fit items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium bg-gold-400/20 text-gold-300">
          OK
        </span>
      )
  }
}

export default function InventoryPage() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [supplies, setSupplies] = useState<InventoryItem[]>([])
  const [outsourced, setOutsourced] = useState<InventoryItem[]>([])
  const [products, setProducts] = useState<CanMakeProduct[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [activeTab, setActiveTab] = useState("stock")

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/pos/me").then(r => r.json()).then(d => {
      if (d.employee) setUser({ name: d.employee.name, role: d.employee.role })
      else { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") }
    }).catch(() => { document.cookie = "session=; max-age=0; path=/"; router.push("/auth/login") })
  }, [router])

  const handleLogout = async () => {
    document.cookie = "session=; max-age=0; path=/"
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/inventory")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setItems(data.ingredients ?? [])
      setSupplies(data.supplies ?? [])
      setOutsourced(data.outsourced ?? [])
      setProducts(data.products ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/backoffice/inventory/log?page=${page}&limit=30`)
      if (!res.ok) throw new Error("Failed to fetch logs")
      const data = await res.json()
      setLogs(data.logs)
      setLogsTotal(data.total)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    fetchLogs(1)
  }, [fetchItems, fetchLogs])

  const filtered = (items || []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.categoryName.toLowerCase().includes(search.toLowerCase())
  )

  function openAdjust(item: InventoryItem) {
    setAdjustItem(item)
    setAdjustQty(0)
    setAdjustNote("")
    setAdjustOpen(true)
  }

  async function handleAdjust() {
    if (!adjustItem || adjustQty === 0) return

    setSaving(true)
    try {
      const res = await fetch("/api/backoffice/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: adjustItem.id,
          qty: adjustQty,
          note: adjustNote || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to adjust")

      setAdjustOpen(false)
      fetchItems()
      fetchLogs(1)
    } catch (err) {
      console.error(err)
      toast.error("Failed to adjust inventory")
    } finally {
      setSaving(false)
    }
  }

  const navLinks = [
    { label: "POS", href: "/pos", icon: StoreIcon },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
    { label: "Sales", href: "/dashboard/sales", icon: TrendingUpIcon },
    { label: "Items", href: "/backoffice/items", icon: PackageIcon },
    { label: "Inventory", href: "/backoffice/inventory", icon: BoxesIcon },
    { label: "Employees", href: "/backoffice/employees", icon: UsersIcon },
  ]

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-transparent"><Loader2Icon className="h-8 w-8 animate-spin text-gold-300" /></div>
  )

  return (
    <div className="flex h-screen flex-col bg-transparent">


      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gold-300">Inventory</h1>
            {user?.role === "admin" && (
              <Button onClick={() => setDeliveryOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
                <TruckIcon className="h-4 w-4" />
                Record Delivery
              </Button>
            )}
          </div>

          <div className="relative w-full max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl pl-9"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab("stock")} className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${activeTab === "stock" ? "bg-brewhas-700 text-white shadow-lg shadow-gold-500/20" : "border-2 border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl text-gold-300 hover:bg-transparent"}`}>
              <Boxes className="size-4" /> Ingredients
            </button>
            <button onClick={() => setActiveTab("log")} className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${activeTab === "log" ? "bg-brewhas-700 text-white shadow-lg shadow-gold-500/20" : "border-2 border-brewhas-700/40 bg-brewhas-900/60 backdrop-blur-xl text-gold-300 hover:bg-transparent"}`}>
              <TrendingUpIcon className="size-4" /> Inventory Log
            </button>
          </div>

          {activeTab === "stock" && (<div className="space-y-4">

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {loading ? (
                  <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-slate-400 shadow-md">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-slate-400 shadow-md">No items found</div>
                ) : (
                  filtered.map((item) => (
                    <div key={item.id} onClick={() => user?.role === "admin" ? openAdjust(item) : null} className={`rounded-2xl border-2 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md ${user?.role === "admin" ? "border-brewhas-700/50 cursor-pointer hover:border-gold-400/50" : "border-brewhas-700/50"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gold-300 text-sm">{item.name}</span>
                        {statusBadge(item.status)}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{item.categoryName || "—"}</span>
                        <span className={`font-mono ${item.status === "out" ? "font-bold text-red-400" : item.status === "low" ? "font-semibold text-amber-400" : "text-gold-300"}`}>
                          {item.stockQty} / min {item.minStock}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                        {user?.role === "admin" && (
                        <Button variant="outline" size="sm" className="rounded-lg border-brewhas-700/40 text-gold-300 hover:bg-transparent" onClick={() => openAdjust(item)}>
                          Adjust
                        </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-transparent hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Item</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Category</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Stock Qty</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Min Stock</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Status</TableHead>
                      <TableHead className="w-24 text-xs font-semibold uppercase text-gold-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                          No items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((item) => (
                        <TableRow
                          key={item.id}
                          className={
                            item.status === "out"
                              ? "bg-red-900/15 transition-colors hover:bg-brewhas-800/30"
                              : item.status === "low"
                                ? "bg-amber-900/15 transition-colors hover:bg-brewhas-800/30"
                                : "transition-colors hover:bg-brewhas-800/30"
                          }
                        >
                          <TableCell className="font-medium text-white">{item.name}</TableCell>
                          <TableCell>{item.categoryName || "—"}</TableCell>
                          <TableCell className={`text-right font-mono tabular-nums ${item.status === "out" ? "font-bold text-red-400" : item.status === "low" ? "font-semibold text-amber-400" : "text-gold-300"}`}>
                            {item.stockQty}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{item.minStock}</TableCell>
                          <TableCell>{statusBadge(item.status)}</TableCell>
                          <TableCell>
                            {user?.role === "admin" ? (
                            <Button variant="outline" size="sm" className="rounded-lg border-brewhas-700/40 text-gold-300 hover:bg-transparent" onClick={() => openAdjust(item)}>
                              Adjust
                            </Button>
                            ) : (
                              <span className="text-xs text-slate-400">View only</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-brewhas-700/50" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Outsourced Products</span>
                <div className="h-px flex-1 bg-brewhas-700/50" />
              </div>

              {outsourced.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No outsourced products</p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="grid grid-cols-1 gap-3 lg:hidden">
                    {outsourced.map((item) => (
                      <div key={item.id} onClick={() => user?.role === "admin" ? openAdjust(item) : null} className="rounded-2xl border-2 border-amber-800/30 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md cursor-pointer hover:border-gold-400/50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gold-300 text-sm">{item.name}</span>
                          {statusBadge(item.status)}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{item.categoryName || "—"}</span>
                          <span className="font-mono text-amber-400">{item.stockQty} / min {item.minStock}</span>
                        </div>
                        <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                          {user?.role === "admin" && (
                          <Button variant="outline" size="sm" className="rounded-lg border-amber-800/30 text-gold-300 hover:bg-brewhas-800/30" onClick={() => openAdjust(item)}>Adjust</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-2xl border-2 border-amber-800/30 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableHead className="text-xs font-semibold uppercase text-gold-300">Item</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-gold-300">Category</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Stock Qty</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Min Stock</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-gold-300">Status</TableHead>
                          <TableHead className="w-24 text-xs font-semibold uppercase text-gold-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outsourced.map(item => (
                          <TableRow key={item.id} className="hover:bg-amber-900/15">
                            <TableCell className="font-medium text-white">{item.name}</TableCell>
                            <TableCell>{item.categoryName || "—"}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-amber-400">{item.stockQty}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{item.minStock}</TableCell>
                            <TableCell>{statusBadge(item.status)}</TableCell>
                            <TableCell>
                              {user?.role === "admin" ? (
                              <Button variant="outline" size="sm" className="rounded-lg border-amber-800/30 text-gold-300 hover:bg-brewhas-800/30" onClick={() => openAdjust(item)}>Adjust</Button>
                              ) : <span className="text-xs text-slate-400">View only</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-brewhas-700/50" />
                <span className="text-xs font-bold uppercase tracking-wider text-gold-300">Supplies</span>
                <div className="h-px flex-1 bg-brewhas-700/50" />
              </div>

              {supplies.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No supplies</p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="grid grid-cols-1 gap-3 lg:hidden">
                    {supplies.map((item) => (
                      <div key={item.id} onClick={() => user?.role === "admin" ? openAdjust(item) : null} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md cursor-pointer hover:border-gold-400/50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gold-300 text-sm">{item.name}</span>
                          {statusBadge(item.status)}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{item.categoryName || "—"}</span>
                          <span className="font-mono text-gold-300">{item.stockQty} / min {item.minStock}</span>
                        </div>
                        <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                          {user?.role === "admin" && (
                          <Button variant="outline" size="sm" className="rounded-lg border-brewhas-700/50 text-gold-300 hover:bg-brewhas-800/30" onClick={() => openAdjust(item)}>Adjust</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableHead className="text-xs font-semibold uppercase text-gold-300">Item</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-gold-300">Category</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Stock Qty</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Min Stock</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-gold-300">Status</TableHead>
                          <TableHead className="w-24 text-xs font-semibold uppercase text-gold-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplies.map(item => (
                          <TableRow key={item.id} className="hover:bg-brewhas-800/3030">
                            <TableCell className="font-medium text-white">{item.name}</TableCell>
                            <TableCell>{item.categoryName || "—"}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-gold-300">{item.stockQty}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{item.minStock}</TableCell>
                            <TableCell>{statusBadge(item.status)}</TableCell>
                            <TableCell>
                              {user?.role === "admin" ? (
                              <Button variant="outline" size="sm" className="rounded-lg border-brewhas-700/40 text-gold-300 hover:bg-transparent" onClick={() => openAdjust(item)}>Adjust</Button>
                              ) : <span className="text-xs text-slate-400">View only</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-brewhas-700/50" />
                <span className="text-xs font-bold uppercase tracking-wider text-gold-300">Finished Products (Can Make)</span>
                <div className="h-px flex-1 bg-brewhas-700/50" />
              </div>

              {/* Can Make — Computed Products */}
              {products && products.length > 0 && (
                <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-5 shadow-md">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Can Make (Computed from Ingredients)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {products.map(p => (
                      <div key={p.id} className="rounded-xl border-2 border-brewhas-700/50 bg-transparent/30 p-4">
                        <p className="text-sm font-bold text-gold-300">{p.name}</p>
                        <p className="mt-1 text-2xl font-extrabold text-gold-300">{p.canMake} <span className="text-xs font-medium text-slate-400">bottles</span></p>
                        <p className="mt-1 text-[0.6rem] text-slate-400">
                          Limited by: <span className="font-semibold text-amber-400">{p.limitedBy}</span>
                        </p>
                        <div className="mt-2 pt-2 border-t border-brewhas-700/50">
                          <p className="text-[0.55rem] font-medium uppercase text-slate-400 mb-1">Recipe (per bottle)</p>
                          {p.recipe.map((r, i) => (
                             <p key={i} className="text-[0.6rem] text-slate-400">{r.perUnit} × {r.name}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>)}

            {activeTab === "log" && (<div className="space-y-4">
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {logs.length === 0 ? (
                  <div className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-8 text-center text-slate-400 shadow-md">No inventory movements yet</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-4 shadow-md">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gold-300 text-sm">{log.itemName}</span>
                        <span className={`font-mono font-bold ${log.changeQty < 0 ? "text-red-400" : "text-gold-300"}`}>
                          {log.changeQty > 0 ? "+" : ""}{log.changeQty}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium capitalize border-brewhas-700/40 text-gold-300">
                          {log.reason}
                        </span>
                        <span className="text-slate-400">After: {log.qtyAfter}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="truncate max-w-[55%]">{log.note || "—"}</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-transparent hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Item</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">Change</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase text-gold-300">After</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Reason</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Note</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-gold-300">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                          No inventory movements yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} className="transition-colors hover:bg-brewhas-800/30">
                          <TableCell className="font-medium text-white">{log.itemName}</TableCell>
                          <TableCell className={`text-right font-mono tabular-nums ${log.changeQty < 0 ? "text-red-400" : "text-gold-300"}`}>
                            {log.changeQty > 0 ? "+" : ""}{log.changeQty}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{log.qtyAfter}</TableCell>
                          <TableCell>
                            <span className="inline-flex h-5 w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize border-brewhas-700/40 text-gold-300">
                              {log.reason}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-48 truncate text-slate-400">{log.note || "—"}</TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {logsTotal > 30 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    Showing {(logsPage - 1) * 30 + 1}-{Math.min(logsPage * 30, logsTotal)} of {logsTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logsPage <= 1}
                      onClick={() => { setLogsPage(logsPage - 1); fetchLogs(logsPage - 1) }}
                      className="border-brewhas-700/40 text-gold-400 hover:bg-transparent"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logsPage * 30 >= logsTotal}
                      onClick={() => { setLogsPage(logsPage + 1); fetchLogs(logsPage + 1) }}
                      className="border-brewhas-700/40 text-gold-400 hover:bg-transparent"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>)}

          <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle>Adjust Stock — {adjustItem?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between rounded-md bg-transparent px-3 py-2">
                  <span className="text-sm text-slate-400">Current Stock</span>
                  <span className="text-lg font-semibold tabular-nums text-gold-300">
                    {adjustItem?.stockQty ?? 0}
                  </span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustQty">Quantity (+/-)</Label>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustQty((prev) => prev - 1)}
                      className="border-brewhas-700/40"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      id="adjustQty"
                      type="number"
                      step="1"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustQty((prev) => prev + 1)}
                      className="border-brewhas-700/40"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {adjustItem && adjustQty !== 0 && (
                    <p className="text-xs text-slate-400">
                      New stock: {Math.max(0, adjustItem.stockQty + adjustQty)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustNote">Note</Label>
                  <Input
                    id="adjustNote"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="e.g. Restock, damaged..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-2 border-brewhas-700/40 text-gold-300 font-medium hover:bg-brewhas-800/30" onClick={() => setAdjustOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdjust} disabled={saving || adjustQty === 0} className="bg-brewhas-700 hover:bg-brewhas-800 text-white">
                  {saving ? "Saving..." : "Confirm Adjustment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DeliveryDialog open={deliveryOpen} onClose={() => { setDeliveryOpen(false); fetchItems(); fetchLogs(1) }} />
        </div>
      </div>
    </div>
  )
}
