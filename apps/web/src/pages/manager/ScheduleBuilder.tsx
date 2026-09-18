"use client"

import { useState } from "react"
import { UsersIcon, SendIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useStaff, useShifts, usePublishSchedule, useUnpublishSchedule } from "@/hooks/useShifts"
import { useLocations } from "@/hooks/useAdminData"
import { DateTime } from 'luxon'
import { AddShiftModal } from "@/components/AddShiftModal"
import { EditShiftModal } from "@/components/EditShiftModal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// --- Types ---
export type Staff = { id: string; name: string; maxHours: number; skills: string[] }
export type Shift = {
  locationId: any; id: string; staffId: string | null; dayId: string; time: string; skill: string; hours: number; startAt: string; endAt: string
}

// --- Static Shift Card ---
function ShiftCard({ shift, onClick }: { shift: Shift, onClick?: () => void }) {
  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
      className="relative flex flex-col gap-1 rounded-md border bg-card p-2 text-xs shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{shift.time}</span>
      </div>
      <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 h-4">{shift.skill}</Badge>
    </div>
  )
}

// --- Main Component ---
export function ScheduleBuilder() {
  const today = DateTime.now().startOf('day')
  const [weekStart, setWeekStart] = useState<DateTime>(() => DateTime.now().startOf('week'))

  // State for AddShiftModal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>()
  const [prefilledStaffId, setPrefilledStaffId] = useState<string | null>(null)

  const { data: locations = [] } = useLocations();
  const [selectedLocId, setSelectedLocId] = useState<string>("");
  const locationId = selectedLocId || locations[0]?.id || "";

  const { data: rawStaff = [] } = useStaff(locationId || null);
  const { data: rawShifts = [] } = useShifts(locationId || null, weekStart.toISODate() ?? undefined);
  const { mutate: publishSchedule } = usePublishSchedule();
  const { mutate: unpublishSchedule } = useUnpublishSchedule();

  // Map Server Staff to UI Shape
  const MOCK_STAFF: Staff[] = rawStaff.length > 0 ? rawStaff.map((s: any) => ({
    id: s.id,
    name: `${s.user.firstName} ${s.user.lastName}`,
    maxHours: s.desiredHoursPerWeek || 40,
    skills: s.skills?.map((sk: any) => sk.skill) || [],
  })) : [];

  // Map Server Shifts to UI Shape
  const shifts: Shift[] = rawShifts.length > 0 ? rawShifts.map((s: any) => {
    const start = DateTime.fromISO(s.startAt);
    const end = DateTime.fromISO(s.endAt);
    return {
      id: s.id,
      staffId: s.assignments?.length > 0 ? s.assignments[0].staffId : null,
      dayId: start.toFormat('ccc'),
      time: `${start.toFormat('h:mma')} - ${end.toFormat('h:mma')}`,
      skill: s.requiredSkill,
      hours: end.diff(start, 'hours').hours,
      startAt: s.startAt,
      endAt: s.endAt,
    }
  }) : [];

  const unassignedShifts = shifts.filter(s => s.staffId === null)

  const handlePublishSchedule = () => {
    publishSchedule(locationId)
  }

  const handleUnpublishSchedule = () => {
    unpublishSchedule(locationId)
  }

  const handleCellClick = (staffId: string, dateIso: string) => {
    setPrefilledStaffId(staffId)
    setPrefilledDate(dateIso)
    setAddModalOpen(true)
  }

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  const handleShiftClick = (shift: Shift) => {
    setEditingShift(shift)
    setEditModalOpen(true)
  }

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:gap-6 md:p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Builder</h1>
          <p className="text-muted-foreground">
            Click on any empty cell to assign a shift, or click an existing shift to edit it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {locations.length > 1 && (
            <Select value={locationId} onValueChange={setSelectedLocId}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <AddShiftModal
            locationId={locationId}
            open={addModalOpen}
            onOpenChange={setAddModalOpen}
            prefilledDate={prefilledDate}
            prefilledStaffId={prefilledStaffId}
            staffList={staffList}
            allShifts={shifts}
            trigger={
              <Button variant="outline" onClick={() => {
                setPrefilledDate(undefined)
                setPrefilledStaffId(null)
              }}>
                Add Shift
              </Button>
            }
          />
          <Button variant="outline" onClick={handleUnpublishSchedule} className="text-muted-foreground">
            Unpublish
          </Button>
          <Button onClick={handlePublishSchedule} className="bg-green-600 hover:bg-green-700 text-white">
            <SendIcon className="mr-2 h-4 w-4" /> Publish Schedule
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(weekStart.minus({ weeks: 1 }))}>
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </Button>
          <span className="font-medium">
            Week of {weekStart.toFormat('MMM d')} - {weekStart.plus({ days: 6 }).toFormat('MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(weekStart.plus({ weeks: 1 }))}>
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start h-full pb-10">

        {/* Main Grid */}
        <div className="xl:col-span-4 rounded-md border bg-card overflow-x-auto shadow-sm">
          <Table className="w-full">
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-45 border-r">Staff Member</TableHead>
                {DAYS.map((day, i) => {
                  const dateLabel = weekStart.plus({ days: i }).toFormat('MMM d');
                  return (
                    <TableHead key={day} className="text-center border-r last:border-r-0 min-w-30">
                      <div>{day}</div>
                      <div className="text-xs font-normal text-muted-foreground">{dateLabel}</div>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_STAFF.map(staff => {
                const staffShifts = shifts.filter(s => s.staffId === staff.id)
                const totalHours = staffShifts.reduce((sum, s) => sum + s.hours, 0)
                const isOvertimeRisk = totalHours >= staff.maxHours - 4;

                return (
                  <TableRow key={staff.id} className="group">
                    <TableCell className="border-r bg-muted/20 font-medium">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{staff.name}</span>
                          <span className={`text-xs ${isOvertimeRisk ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>
                            {totalHours}h / {staff.maxHours}h
                          </span>
                        </div>
                        <Progress
                          value={Math.min((totalHours / staff.maxHours) * 100, 100)}
                          className={`h-1.5 w-full ${isOvertimeRisk ? '[&>div]:bg-amber-500' : ''}`}
                        />
                        {staff.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {staff.skills.map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                {skill.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {DAYS.map((day, i) => {
                      const cellDate = weekStart.plus({ days: i })
                      const cellDateIso = cellDate.toISODate()!;
                      const isPastDay = cellDate.startOf('day') < today;
                      const shiftsInCell = shifts.filter(s => s.staffId === staff.id && s.dayId === day)

                      return (
                        <TableCell
                          key={day}
                          className={`min-w-30 p-2 align-top border-r transition-colors ${isPastDay
                              ? 'bg-muted/30 opacity-60 cursor-not-allowed pointer-events-none'
                              : 'hover:bg-primary/5 cursor-pointer'
                            }`}
                          onClick={() => !isPastDay && handleCellClick(staff.id, cellDateIso)}
                        >
                          <div className="flex flex-col gap-2 min-h-15">
                            {shiftsInCell.map(shift => (
                              <ShiftCard
                                key={shift.id}
                                shift={shift}
                                onClick={isPastDay ? undefined : () => handleShiftClick(shift)}
                              />
                            ))}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Unassigned Pool Sidebar */}
        <div className="xl:col-span-1 rounded-md border bg-card shadow-sm overflow-hidden flex flex-col h-125">
          <div className="bg-muted/50 p-4 border-b flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Unassigned Pool</h3>
            <Badge variant="secondary" className="ml-auto">{unassignedShifts.length}</Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-sm text-muted-foreground mb-4">
              Click an unassigned shift to assign it to a staff member.
            </div>
            <div className="flex flex-col gap-3">
              {unassignedShifts.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-md">
                  No unassigned shifts.
                </div>
              )}
              {unassignedShifts.map(shift => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onClick={() => handleShiftClick(shift)}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      <EditShiftModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        shift={editingShift}
        staffList={MOCK_STAFF}
        allShifts={shifts}
      />
    </div>
  )
}