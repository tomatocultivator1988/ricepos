"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PrinterIcon, CheckCircleIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react"
import { printReceipt } from "@/lib/utils/printer"
import { toast } from "sonner"

const STORE_NAME = "Brewhas Coffeehouse"
const STORE_TIN = "000-000-000-000"
const STORE_ADDRESS = "454C Boni Avenue, Mandaluyong City"

function formatCurrency(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
}

function fmtSaleNum(n: number | null): string {
  return n != null ? String(n).padStart(6, '0') : '-'
}

interface ReceiptItem { itemName: string; qty: number; unitPrice: number; lineTotal: number }
interface ReceiptPayment { method: string; amount: number }
interface ReceiptData {
  id: string; saleNumber: number | null; createdAt: string; employeeName: string
  items: ReceiptItem[]; subtotal: number; discountAmt: number; taxTotal: number
  total: number; payments: ReceiptPayment[]; paymentMethod: string
}

interface ReceiptViewProps {
  saleId: string
  initialData?: ReceiptData
  drawerOpened?: boolean
  onClose: () => void
  backLabel?: string
}

export function ReceiptView({ saleId, initialData, drawerOpened, onClose, backLabel = "Back to POS" }: ReceiptViewProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [printing, setPrinting] = useState(false)

  const handlePrint = async () => {
    if (!receipt) return
    setPrinting(true)
    try {
      const ok = await printReceipt({
        header: STORE_NAME,
        subtitle: 'Official Receipt',
        items: receipt.items.map(item => ({
          name: item.itemName,
          qty: item.qty,
          price: item.lineTotal,
        })),
        subtotal: receipt.subtotal,
        discount: receipt.discountAmt,
        tax: receipt.taxTotal,
        total: receipt.total,
        paymentMethod: receipt.paymentMethod || 'CASH',
        amountTendered: 0,
        change: 0,
        orderNumber: receipt.saleNumber != null ? `#${receipt.saleNumber}` : '-',
        date: new Date(receipt.createdAt).toLocaleString('en-PH'),
        cashier: receipt.employeeName || 'Cashier',
        footer: 'Salamat po! Come again!',
      })
      if (ok) {
        toast.success('Receipt printed')
      } else {
        toast.error('Printer not connected. Go to Settings to pair.')
      }
    } catch {
      toast.error('Print failed. Check printer connection.')
    } finally {
      setPrinting(false)
    }
  }
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) { setReceipt(initialData); setLoading(false); return }
    let active = true
    async function load() {
      try {
        let res = await fetch(`/api/receipts/${saleId}`)
        if (!res.ok) { await new Promise(r => setTimeout(r, 1000)); res = await fetch(`/api/receipts/${saleId}`) }
        if (!res.ok) throw new Error("Failed to load receipt")
        const data = await res.json()
        if (active) setReceipt(data.sale as ReceiptData)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load receipt")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [saleId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-gold-400/20">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2Icon className="size-8 animate-spin text-gold-400" />
            <p className="text-sm text-slate-400">Loading receipt...</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {receipt && (
          <div id="receipt-printable" className="text-sm">
            <div className="text-center">
              <p className="text-lg font-extrabold tracking-tight text-gold-300">{STORE_NAME}</p>
              <p className="text-[0.6rem] text-slate-400">{STORE_ADDRESS}</p>
              <p className="text-[0.6rem] text-slate-400">TIN: {STORE_TIN}</p>
              <p className="mt-0.5 text-xs font-medium text-gold-400/80">Official Receipt</p>
            </div>

            <div className="mt-4 space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt #</span>
                <span className="tabular-nums font-semibold text-gold-300">{receipt.saleNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-300">{new Date(receipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier</span>
                <span className="text-slate-300">{receipt.employeeName}</span>
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-brewhas-700/50" />

            <div className="space-y-1.5">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-gold-200">
                  <span className="flex-1 truncate">
                    {item.itemName}
                    <span className="ml-1 text-xs text-slate-500 tabular-nums"> x{item.qty}</span>
                  </span>
                  <span className="tabular-nums shrink-0 font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-brewhas-700/50" />

            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discountAmt > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatCurrency(receipt.discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span className="tabular-nums">{formatCurrency(receipt.taxTotal)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-brewhas-700/50 pt-2 text-lg font-extrabold text-gold-300">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(receipt.total)}</span>
              </div>
            </div>

            <div className="my-3 border-t border-dashed border-brewhas-700/50" />

            <div className="space-y-1 text-slate-300">
              {receipt.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-500 capitalize">{p.method}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-sm font-bold text-gold-300 tracking-tight">
              Salamat po! Come again!
            </p>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          {drawerOpened && (
            <p className="rounded-lg bg-gold-400/10 px-3 py-2 text-center text-xs font-medium text-gold-300 ring-1 ring-gold-400/30">
              <CheckCircleIcon className="mr-1 inline size-3.5" />
              Cash drawer opened
            </p>
          )}
          {receipt && (
            <Button className="w-full rounded-xl bg-gold-500 text-brewhas-950 font-semibold hover:bg-gold-400 shadow-lg shadow-gold-500/25" size="lg" onClick={handlePrint} disabled={printing}>
              {printing ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <PrinterIcon className="mr-2 size-4" />}
              {printing ? 'Printing...' : 'Print Receipt'}
            </Button>
          )}
          <Button className="w-full rounded-xl border-2 border-brewhas-700/50 bg-brewhas-800/30 font-semibold text-gold-300 hover:bg-brewhas-700/50 shadow-md" size="lg" onClick={onClose}>
            <ArrowLeftIcon className="mr-2 size-4" />
            {backLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
