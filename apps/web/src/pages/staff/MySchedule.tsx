"use client"

import { useState } from "react"
import { useDashboardStats } from "@/hooks/useDashboard"
import { useMyRequests } from "@/hooks/useStaffFeatures"
import { ManageStaffShiftModal } from "@/components/staff/ManageStaffShiftModal"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ArrowRightLeftIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DateTime } from "luxon"

// ─── Status badge config ──────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: AlertCircleIcon },
  ACCEPTED: { label: "Accepted by Staff", variant: "default", icon: CheckCircleIcon },
  APPROVED: { label: "Manager Approved", variant: "default", icon: CheckCircleIcon },
  REJECTED: { label: "Declined", variant: "destructive", icon: XCircleIcon },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: XCircleIcon },
  EXPIRED: { label: "Expired", variant: "outline", icon: XCircleIcon },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { label: status, variant: "secondary" as const, icon: AlertCircleIcon }
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  )
}

// ─── Week navigator ───────────────────────────────────────────────────────────
function getWeekDays(weekOffset: number) {
  const now = DateTime.now().startOf("week").plus({ weeks: weekOffset })
  return Array.from({ length: 7 }, (_, i) => now.plus({ days: i }))
}

export function MySchedule() {
  const { data, isLoading } = useDashboardStats()
  const { data: myRequests, isLoading: requestsLoading } = useMyRequests()

  const [weekOffset, setWeekOffset] = useState(0)
  const [manageModalOpen, setManageModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<any>(null)

  const weekDays = getWeekDays(weekOffset)
  const assignments: any[] = data?.allShifts || []

  // Group assignments by date string (yyyy-MM-dd)
  const assignmentsByDate: Record<string, any[]> = {}
  for (const a of assignments) {
    const dateKey = DateTime.fromISO(a.shift.startAt).toFormat("yyyy-MM-dd")
    if (!assignmentsByDate[dateKey]) assignmentsByDate[dateKey] = []
    assignmentsByDate[dateKey].push(a)
  }

  const allRequests = [
    ...(myRequests?.swapRequests || []).map((r: any) => ({ ...r, requestType: "Swap" })),
    ...(myRequests?.dropRequests || []).map((r: any) => ({ ...r, requestType: "Drop" })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const pendingCount = allRequests.filter(r =>
    r.status === "PENDING" || r.status === "ACCEPTED"
  ).length

  return (
    <div className="flex flex-1 flex-col py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-3 mb-1">
          <CalendarIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">My Schedule</h1>
        </div>
        <p className="text-muted-foreground">View your upcoming shifts and manage swap or drop requests.</p>
      </div>

      {/* Limit warning */}
      {pendingCount >= 3 && (
        <div className="px-4 lg:px-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            You have {pendingCount} pending requests — the maximum is 3. Resolve existing requests before submitting new ones.
          </div>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <Tabs defaultValue="schedule" className="w-full flex gap-1 flex-col h-[calc(100vh-200px)]">
          <TabsList className="mb-4 gap-1 bg-none">
            <TabsTrigger value="schedule">
              <CalendarIcon className="w-4 h-4 mr-1.5" />
              My Shifts
            </TabsTrigger>
            <TabsTrigger value="requests">
              <ArrowRightLeftIcon className="w-4 h-4 mr-1.5" />
              My Requests
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ─── Schedule Tab ─── */}
          <TabsContent value="schedule">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Week navigation */}
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
                    <ChevronLeftIcon className="w-4 h-4" />
                    Prev Week
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {weekDays[0].toFormat("MMM d")} – {weekDays[6].toFormat("MMM d, yyyy")}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
                    Next Week
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>

                {/* Week grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dateKey = day.toFormat("yyyy-MM-dd")
                    const dayAssignments = assignmentsByDate[dateKey] || []
                    const isToday = dateKey === DateTime.now().toFormat("yyyy-MM-dd")

                    return (
                      <div key={dateKey} className={`rounded-xl border p-3 min-h-30 flex flex-col gap-2 ${isToday ? "border-primary/50 bg-primary/5" : "bg-muted/30"}`}>
                        <div className="text-center">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                            {day.toFormat("EEE")}
                          </p>
                          <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                            {day.toFormat("d")}
                          </p>
                        </div>

                        {dayAssignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center mt-2">Off</p>
                        ) : (
                          dayAssignments.map((a: any) => {
                            const start = DateTime.fromISO(a.shift.startAt)
                            const end = DateTime.fromISO(a.shift.endAt)
                            return (
                              <button
                                key={a.id}
                                onClick={() => { setSelectedShift(a); setManageModalOpen(true) }}
                                className="w-full text-left rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 p-2 transition-colors group"
                              >
                                <p className="text-xs font-semibold text-primary truncate">
                                  {a.shift.requiredSkill.replace(/_/g, " ")}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <ClockIcon className="w-3 h-3" />
                                  {start.toFormat("h:mm a")}–{end.toFormat("h:mm a")}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  <span className="truncate">{a.shift.location.name}</span>
                                </p>
                                <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Tap to manage →
                                </p>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )
                  })}
                </div>

                {assignments.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                      <CalendarIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-semibold">No Upcoming Shifts</h3>
                      <p className="text-muted-foreground text-sm">You don't have any shifts assigned yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── Requests Tab ─── */}
          <TabsContent value="requests">
            {requestsLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : allRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <ArrowRightLeftIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold">No Requests Yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Tap a shift in your schedule to request a swap or drop it.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>My Swap & Drop Requests</CardTitle>
                  <CardDescription>Track the status of your outgoing swap and drop requests.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>With / Dropped to</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRequests.map((r: any) => {
                          const start = DateTime.fromISO(r.shift.startAt)
                          return (
                            <TableRow key={r.id}>
                              <TableCell>
                                <Badge variant="outline" className={r.requestType === "Swap" ? "border-blue-500/40 text-blue-600" : "border-orange-500/40 text-orange-600"}>
                                  {r.requestType}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {r.shift.requiredSkill.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{start.toFormat("EEE, MMM d")}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {start.toFormat("h:mm a")}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {r.requestType === "Swap" && r.toStaff ? (
                                  <span className="text-sm">{r.toStaff.firstName} {r.toStaff.lastName}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm italic">Anyone</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={r.status} />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {DateTime.fromISO(r.createdAt).toRelative()}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ManageStaffShiftModal
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
        shiftAssignment={selectedShift}
      />
    </div>
  )
}
