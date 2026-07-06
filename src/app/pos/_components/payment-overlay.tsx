"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useCartContext } from "./cart-context"
import { ReceiptView } from "./receipt-view"
import { toast } from "sonner"
import { generateId } from "@/lib/utils/id"
import { openCashDrawer } from "@/lib/utils/cash-drawer"
import { Banknote, CreditCard, Wallet, Loader2 } from "lucide-react"

function formatCurrency(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
}

interface PaymentOverlayProps {
  onClose: () => void
  employeeId: string
  shiftId?: string | null
}

export function PaymentOverlay({ onClose, employeeId, shiftId }: PaymentOverlayProps) {
  const { items, totals, customerId, discount, clearCart } = useCartContext()

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash")
  const [amountTendered, setAmountTendered] = useState("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [drawerOpened, setDrawerOpened] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (paymentMethod === "cash") {
      setAmountTendered(formatCurrency(totals.total))
    } else {
      setAmountTendered("")
    }
  }, [paymentMethod, totals.total])

  const change = useMemo(() => {
    if (paymentMethod !== "cash") return 0
    const tendered = parseFloat(amountTendered.replace(/[^0-9.]/g, ""))
    if (isNaN(tendered) || tendered < totals.total) return 0
    return Math.round((tendered - totals.total) * 100) / 100
  }, [paymentMethod, amountTendered, totals.total])

  const canComplete = useMemo(() => {
    if (paymentMethod === "cash") {
      const tendered = parseFloat(amountTendered.replace(/[^0-9.]/g, ""))
      return !isNaN(tendered) && tendered >= totals.total
    }
    return true
  }, [paymentMethod, amountTendered, totals.total])

  const handleComplete = async () => {
    setProcessing(true)
    setError(null)

    try {
      if (!employeeId) throw new Error("No cashier logged in.")

      const saleId = generateId()
      const now = new Date().toISOString()
      const saleItemsPayload = items.map((item, i) => ({
        id: generateId(),
        itemId: item.id,
        itemName: item.name,
        unitPrice: item.unitPrice,
        qty: item.qty,
        taxRate: item.taxRate,
        discountTotal: 0,
        taxTotal: totals.lineItems[i]?.taxAmount ?? 0,
        lineTotal: totals.lineItems[i]?.lineTotal ?? item.unitPrice * item.qty,
        modifiers: JSON.stringify(item.modifiers),
        variantId: item.variantId || null,
      }))

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: saleId,
          employeeId,
          shiftId: shiftId || undefined,
          customerId: customerId || null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountAmount,
          taxTotal: totals.taxTotal,
          grandTotal: totals.total,
          discountId: null,
          paymentMethod,
          amountTendered:
            paymentMethod === "cash"
              ? parseFloat(amountTendered.replace(/[^0-9.]/g, ""))
              : undefined,
          status: "completed",
          createdAt: now,
          saleItems: saleItemsPayload,
          payments: [
            {
              id: generateId(),
              method: paymentMethod,
              amount: totals.total,
            },
          ],
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Sale failed" }))
        throw new Error(errData.error || errData.message || "Failed to complete sale")
      }

      const result = await res.json()
      toast.success(`Sale #${result.saleNumber} completed`)

      // Signal customer display - show "Salamat po!" with total
      fetch("/api/pos/cart/display", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [], subtotal: 0, taxTotal: 0, total: totals.total, status: "complete" }),
      }).catch(() => {})

      openCashDrawer().then(ok => { if (ok) setDrawerOpened(true) }).catch(() => {})
      setReceiptData(result.receipt || result)
      setCompletedSaleId(result.id ?? saleId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete sale"
      setError(message)
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  if (completedSaleId) {
    return (
      <ReceiptView
        saleId={completedSaleId}
        initialData={receiptData || undefined}
        drawerOpened={drawerOpened}
        onClose={() => {
          clearCart()
          onClose()
        }}
      />
    )
  }

  const methods = [
    { key: "cash" as const, label: "Cash", icon: Banknote },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="flex w-full max-w-md animate-slide-up flex-col rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl">
        <h2 className="font-display text-lg font-bold text-foreground">Complete Sale</h2>

        <div className="mt-4 text-center">
          <span className="font-display text-4xl font-bold tabular-nums text-primary">
            {formatCurrency(totals.total)}
          </span>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {methods.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  paymentMethod === key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === "cash" && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Amount Tendered
              </label>
              <Input
                ref={amountInputRef}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder="₱0.00"
                required
                className="mt-1 h-12 border-2 border-slate-300 bg-white text-lg font-bold tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-brewhas-500 focus:ring-2 focus:ring-brewhas-200"
                onFocus={(e) => e.target.select()}
              />
            </div>
            {change > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-accent/10 px-4 py-2.5">
                <span className="text-sm font-medium text-muted-foreground">Change</span>
                <span className="text-lg font-semibold tabular-nums text-accent">
                  {formatCurrency(change)}
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-2">
          <Button
            className="h-12 w-full rounded-xl font-display font-semibold"
            size="lg"
            disabled={!canComplete || processing}
            onClick={handleComplete}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Complete Sale - ${formatCurrency(totals.total)}`
            )}
          </Button>
          <Button
            variant="ghost"
            className="mx-auto flex w-fit text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            size="sm"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
