"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  PrinterIcon, CheckCircleIcon, XCircleIcon,
  Loader2Icon, PlugIcon, ReceiptIcon, LinkIcon
} from "lucide-react"
import {
  pairPrinter, reconnectPrinter, isPrinterConnected, getPrinterName,
  printReceipt, openDrawerViaPrinter,
  getDrawerMethod, setDrawerMethod,
  getAutoPrint, setAutoPrint,
} from "@/lib/utils/printer"

function ConnectionStatus({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <CheckCircleIcon className="h-3 w-3" /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-gold-400">
      <XCircleIcon className="h-3 w-3" /> Not connected
    </span>
  )
}

export default function SettingsPage() {
  const [printerName, setPrinterName] = useState("Not paired")
  const [connected, setConnected] = useState(false)
  const [pairing, setPairing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [drawerMethod, setDrawerMethodState] = useState<'printer' | 'usb' | 'none'>('printer')
  const [autoPrint, setAutoPrintState] = useState(false)

  useEffect(() => {
    const init = async () => {
      const reconnected = await reconnectPrinter()
      setConnected(reconnected)
      setPrinterName(getPrinterName())
      setDrawerMethodState(getDrawerMethod())
      setAutoPrintState(getAutoPrint())
    }
    init()
  }, [])

  const handlePair = async () => {
    setPairing(true)
    try {
      const ok = await pairPrinter()
      if (ok) {
        setConnected(true)
        setPrinterName(getPrinterName())
        toast.success("Printer paired successfully")
      } else {
        toast.error("Pairing failed or cancelled")
      }
    } catch {
      toast.error("Bluetooth not supported on this browser")
    } finally {
      setPairing(false)
    }
  }

  const handleTestPrint = async () => {
    setTesting(true)
    try {
      const ok = await printReceipt({
        header: "Brewhas Coffeehouse",
        subtitle: "TEST PRINT",
        items: [],
        subtotal: 0, discount: 0, tax: 0, total: 0,
        paymentMethod: "TEST",
        amountTendered: 0, change: 0,
        orderNumber: "TEST",
        date: new Date().toLocaleString("en-PH"),
        cashier: "System",
        footer: "This is a test print",
      })
      toast[ok ? "success" : "error"](ok ? "Test print sent" : "Printer not connected")
    } catch {
      toast.error("Print failed")
    } finally {
      setTesting(false)
    }
  }

  const handleTestDrawer = async () => {
    setTesting(true)
    try {
      const ok = await openDrawerViaPrinter()
      if (ok) {
        toast.success("Drawer should open now")
      } else {
        toast.error("Drawer command failed — check connection")
      }
    } catch {
      toast.error("Drawer test failed")
    } finally {
      setTesting(false)
    }
  }

  const handleDrawerMethod = (method: 'printer' | 'usb' | 'none') => {
    setDrawerMethodState(method)
    setDrawerMethod(method)
  }

  const handleAutoPrint = (val: boolean) => {
    setAutoPrintState(val)
    setAutoPrint(val)
  }

  return (
    <div className="p-5 space-y-6">
      <h1 className="text-2xl font-bold text-gold-200">Settings</h1>

      {/* Printer Section */}
      <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PrinterIcon className="h-5 w-5 text-gold-300" />
            <h2 className="text-sm font-bold text-gold-200">Bluetooth Printer</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gold-400">{printerName}</p>
              <ConnectionStatus connected={connected} />
            </div>
            <Button
              onClick={handlePair}
              disabled={pairing}
              className="bg-brewhas-700 hover:bg-brewhas-800 text-white rounded-xl"
              size="sm"
            >
              {pairing ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Pair Printer
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestPrint}
              disabled={testing}
              className="rounded-xl border-brewhas-700/40 text-gold-300 hover:bg-transparent"
              size="sm"
            >
              {testing ? <Loader2Icon className="mr-1 h-3 w-3 animate-spin" /> : <ReceiptIcon className="mr-1 h-3 w-3" />}
              Test Print
            </Button>
            <Button
              variant="outline"
              onClick={handleTestDrawer}
              disabled={testing}
              className="rounded-xl border-brewhas-700/40 text-gold-300 hover:bg-transparent"
              size="sm"
            >
              {testing ? <Loader2Icon className="mr-1 h-3 w-3 animate-spin" /> : <PlugIcon className="mr-1 h-3 w-3" />}
              Test Drawer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cash Drawer Section */}
      <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PlugIcon className="h-5 w-5 text-gold-300" />
            <h2 className="text-sm font-bold text-gold-200">Cash Drawer</h2>
          </div>

          <p className="text-xs text-slate-400">How is the cash drawer connected?</p>

          <div className="space-y-2">
            {[
              { key: 'printer' as const, label: 'Connected to printer (RJ12 cable)', desc: 'Drawer opens via printer port' },
              { key: 'usb' as const, label: 'Connected to tablet (USB / OTG)', desc: 'Drawer connected directly to this tablet' },
              { key: 'none' as const, label: 'No cash drawer', desc: 'Skip drawer — manual only' },
            ].map(option => (
              <label key={option.key} className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                drawerMethod === option.key ? "border-brewhas-500 bg-transparent" : "border-slate-200 hover:border-brewhas-700/40"
              }`}>
                <input
                  type="radio"
                  name="drawer"
                  checked={drawerMethod === option.key}
                  onChange={() => handleDrawerMethod(option.key)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-gold-300">{option.label}</p>
                  <p className="text-xs text-slate-400">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Section */}
      <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5 text-gold-300" />
            <h2 className="text-sm font-bold text-gold-200">Receipt Options</h2>
          </div>

          <label className="flex items-center justify-between rounded-xl border-2 border-slate-200 p-3 cursor-pointer hover:border-brewhas-700/40">
            <div>
              <p className="text-sm font-semibold text-gold-300">Auto-print after sale</p>
              <p className="text-xs text-slate-400">Print receipt automatically when sale completes</p>
            </div>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={e => handleAutoPrint(e.target.checked)}
              className="h-5 w-5"
            />
          </label>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card className="rounded-2xl border-2 border-brewhas-700/50 bg-brewhas-900/60 backdrop-blur-xl shadow-md">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-gold-200">Backup & Restore</h2>
          <p className="text-xs text-slate-400">Export all data or restore from a previous backup.</p>
          <div className="flex gap-2">
            <Button onClick={() => window.open("/api/backup", "_blank")} className="bg-brewhas-700 hover:bg-brewhas-800 text-white rounded-xl" size="sm">Export All Data</Button>
            <Button variant="outline" size="sm" className="rounded-xl border-brewhas-700/40 text-gold-300 hover:bg-transparent relative">
              <input id="restore-file" type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" title="Select backup file to restore" onChange={async (e: any) => {
                const file = e.target.files?.[0]; if (!file) return
                try {
                  const text = await file.text(); const data = JSON.parse(text)
                  const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
                  const result = await res.json()
                  if (res.ok) toast.success("Restored " + result.imported + " records")
                  else toast.error("Restore failed")
                } catch { toast.error("Invalid backup file") }
                e.target.value = ""
              }} />
              Restore
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400 pb-4">
        Settings are saved to this browser automatically.
      </p>
    </div>
  )
}
