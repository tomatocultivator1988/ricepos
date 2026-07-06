"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { PaymentOverlay } from "./payment-overlay"
import { ShoppingBag, Plus, Minus, X, Trash2 } from "lucide-react"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n)
}

import { useCartContext } from "./cart-context"

interface CartPanelProps {
  cashier: { id: string; name: string; role: string }
}

export function CartPanel({ cashier }: CartPanelProps) {
  const { items, totals, itemCount, updateQty, removeItem, clearCart, discount, setDiscount } =
    useCartContext()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState("")

  const handleDiscountApply = () => {
    const value = parseFloat(discountInput)
    if (isNaN(value) || value <= 0) return
    setDiscount({ type: "fixed", value })
  }

  const handleClearDiscount = () => {
    setDiscount(undefined)
    setDiscountInput("")
  }

  return (
    <>
      <div className="flex flex-col border-l border-border bg-brewhas-50/80 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">Cart</span>
          </div>
          {itemCount > 0 && (
            <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-semibold tabular-nums text-primary">
              {itemCount}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4">
            <p className="text-sm text-muted-foreground">Cart is empty</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="flex-1 text-sm font-medium text-foreground leading-snug">
                    {item.name}
                  </span>
                  <button
                    onClick={() => removeItem(index)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(index, item.qty - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-primary/10"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums font-medium">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(index, item.qty + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-primary/10"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(item.unitPrice * item.qty)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Discount amount"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-9 text-sm"
              />
              {discount ? (
                <Button size="sm" variant="ghost" onClick={handleClearDiscount}>
                  Clear
                </Button>
              ) : (
                <Button size="sm" onClick={handleDiscountApply}>
                  Apply
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 border-t border-border bg-brewhas-50/95 backdrop-blur-sm px-4 py-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-destructive">
                <span>Discount</span>
                <span className="tabular-nums">
                  &minus;{formatCurrency(totals.discountAmount)}
                </span>
              </div>
            )}
            {totals.taxBreakdown.map((tb, i) => (
              <div key={i} className="flex justify-between text-xs text-muted-foreground">
                <span>Tax ({tb.rate}%)</span>
                <span className="tabular-nums">{formatCurrency(tb.amount)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="font-display text-2xl font-bold text-primary">TOTAL</span>
              <span className="font-display text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border p-4">
          <Button
            className="h-14 w-full rounded-2xl font-display text-lg font-semibold shadow-lg shadow-primary/20"
            size="lg"
            disabled={items.length === 0}
            onClick={() => setPaymentOpen(true)}
          >
            CHARGE {formatCurrency(totals.total)}
          </Button>
          <Button
            variant="ghost"
            className="mx-auto flex w-fit text-xs"
            size="sm"
            onClick={clearCart}
            disabled={items.length === 0}
          >
            <Trash2 className="mr-1 size-3" />
            Clear
          </Button>
        </div>
      </div>
      {paymentOpen && (
        <PaymentOverlay onClose={() => setPaymentOpen(false)} employeeId={cashier.id} />
      )}
    </>
  )
}
