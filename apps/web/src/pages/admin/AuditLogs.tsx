import { useState, useMemo } from "react"
import { SearchIcon, DownloadIcon, LoaderIcon, ShieldIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuditLogs } from "@/hooks/useAdminData"



const ACTION_COLORS: Record<string, string> = {
  SHIFT_CREATED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  SHIFT_ASSIGNED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  SHIFT_UNASSIGNED: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  SCHEDULE_PUBLISHED: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  SWAP_REQUESTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  SWAP_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  SWAP_DENIED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  DROP_REQUESTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  DROP_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DROP_DENIED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  DROP_CLAIMED: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  USER_CREATED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
}

const ENTITY_COLORS: Record<string, string> = {
  SHIFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SWAP_REQUEST: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  DROP_REQUEST: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  USER: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
}

function formatAction(action: string) {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function downloadCSV(logs: any[]) {
  const headers = ['Timestamp', 'Action', 'Entity Type', 'Performed By', 'Target ID', 'Details']
  const rows = logs.map(log => [
    new Date(log.date).toLocaleString(),
    log.action,
    log.entityType || '',
    log.user,
    log.target,
    log.details,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AuditLogs() {
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const itemsPerPage = 15

  const { data: logs = [], isLoading } = useAuditLogs()

  const filtered = useMemo(() => {
    return logs.filter((log: any) => {
      const matchesSearch =
        !search ||
        log.user?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase()) ||
        log.target?.toLowerCase().includes(search.toLowerCase())

      const matchesEntity =
        entityFilter === "all" || log.entityType === entityFilter

      return matchesSearch && matchesEntity
    })
  }, [logs, search, entityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const currentLogs = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleEntityFilterChange = (value: string) => {
    setEntityFilter(value)
    setCurrentPage(1)
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">Comprehensive record of all system activity and changes.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => downloadCSV(filtered)} disabled={filtered.length === 0}>
          <DownloadIcon className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by user, action, or details..."
            className="pl-8"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <Select value={entityFilter} onValueChange={handleEntityFilterChange}>
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="SHIFT">Shifts</SelectItem>
            <SelectItem value="SWAP_REQUEST">Swap Requests</SelectItem>
            <SelectItem value="DROP_REQUEST">Drop Requests</SelectItem>
            <SelectItem value="USER">Users</SelectItem>
          </SelectContent>
        </Select>
        {(search || entityFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setEntityFilter("all"); setCurrentPage(1) }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <LoaderIcon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : currentLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldIcon className="h-8 w-8 opacity-30" />
                    <p className="text-sm">
                      {search || entityFilter !== "all"
                        ? "No logs match your filters."
                        : "No audit logs yet. They will appear here as actions are performed in the system."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              currentLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.date).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                      {formatAction(log.action)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ENTITY_COLORS[log.entityType] ?? 'bg-muted text-muted-foreground'}`}>
                      {log.entityType?.replace('_', ' ') ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{log.user}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-sm truncate">
                    {log.details || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? "No results"
              : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filtered.length)} of ${filtered.length} entries`}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
