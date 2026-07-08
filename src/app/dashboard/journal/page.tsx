"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Loader2Icon } from "lucide-react"

interface JournalEntry {
  id: string; event_type: string; sale_id: string | null;
  employee_id: string | null; details: any; created_at: string;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/journal").then(r => r.json()).then(d => {
      setEntries(d.entries ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = search
    ? entries.filter(e => e.event_type?.toLowerCase().includes(search.toLowerCase()))
    : entries

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Electronic Journal</h1>
      </div>
      <div className="relative max-w-sm md:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
        <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-gold-100 border-amber-300/60 text-stone-800" />
      </div>

      {loading ? (
        <Card className="bg-gold-200/90 border-amber-300/60"><CardContent className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-green-700" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-gold-200/90 border-amber-300/60"><CardContent className="text-center text-stone-500 py-16"><p>Journal records all sales, voids, refunds, and collections.</p><p className="text-xs mt-1">Entries appear here after each transaction.</p></CardContent></Card>
      ) : (
        <>
        {/* Mobile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:hidden">
          {filtered.map(e => (
            <div key={e.id} className="bg-gold-200 rounded-xl p-4 border border-amber-300/60 space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-stone-800 text-sm capitalize">{e.event_type}</span>
                <span className="text-xs text-stone-500">{new Date(e.created_at).toLocaleString("en-PH")}</span>
              </div>
              <div className="text-xs text-stone-500">
                <span>{e.sale_id ? <span className="text-green-700 font-medium">Sale</span> : "—"}{e.details ? ` · ${JSON.stringify(e.details)}` : ""}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop Table */}
        <Card className="hidden md:block bg-gold-200/90 border-amber-300/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-300/60 hover:bg-transparent">
                  <TableHead className="text-stone-700">Timestamp</TableHead>
                  <TableHead className="text-stone-700">Event</TableHead>
                  <TableHead className="text-stone-700">Sale</TableHead>
                  <TableHead className="text-stone-700">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className="border-amber-300/60">
                    <TableCell className="text-xs text-stone-500">{new Date(e.created_at).toLocaleString("en-PH")}</TableCell>
                    <TableCell className="text-stone-700">{e.event_type}</TableCell>
                    <TableCell className="text-stone-500">{e.sale_id ? <span className="text-green-700 font-medium">Sale</span> : "—"}</TableCell>
                    <TableCell className="text-xs text-stone-500 max-w-xs truncate">{JSON.stringify(e.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  )
}
