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
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-white" />
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-emerald-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-500 py-16">
              <p>Journal records all sales, voids, refunds, and collections.</p>
              <p className="text-xs mt-1">Entries appear here after each transaction.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Timestamp</TableHead>
                  <TableHead className="text-slate-300">Event</TableHead>
                  <TableHead className="text-slate-300">Sale</TableHead>
                  <TableHead className="text-slate-300">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className="border-slate-800">
                    <TableCell className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString("en-PH")}</TableCell>
                    <TableCell className="text-slate-300">{e.event_type}</TableCell>
                    <TableCell className="text-slate-400">{e.sale_id?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{JSON.stringify(e.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
