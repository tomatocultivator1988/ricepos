"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Loader2Icon } from "lucide-react"

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/audit").then(r => r.json()).then(d => {
      setLogs(d.logs ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = search ? logs.filter((l: any) =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase())
  ) : logs

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
        <Input placeholder="Search by action or entity..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-gold-100 border-amber-300/60 text-stone-800" />
      </div>

      <Card className="bg-gold-200/90 border-amber-300/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2Icon className="h-8 w-8 animate-spin text-green-700" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-stone-500 py-16">Audit log is recording sensitive actions. No entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-amber-300/60 hover:bg-transparent">
                  <TableHead className="text-stone-700">Date</TableHead>
                  <TableHead className="text-stone-700">Employee</TableHead>
                  <TableHead className="text-stone-700">Action</TableHead>
                  <TableHead className="text-stone-700">Entity</TableHead>
                  <TableHead className="text-stone-700">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => (
                  <TableRow key={l.id} className="border-amber-300/60">
                    <TableCell className="text-xs text-stone-500">{new Date(l.created_at).toLocaleString("en-PH")}</TableCell>
                    <TableCell className="text-stone-700">{l.employeeName}</TableCell>
                    <TableCell className="text-stone-700">{l.action}</TableCell>
                    <TableCell className="text-stone-500">{l.entity_type}</TableCell>
                    <TableCell className="text-xs text-stone-500 max-w-xs truncate">
                      {l.old_value ? `${JSON.stringify(l.old_value)} → ` : ""}{JSON.stringify(l.new_value ?? "")}
                    </TableCell>
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
