"use client"

import * as React from "react"
import { useCreateShift, useAssignShift } from "@/hooks/useShifts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangleIcon, AlertCircleIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Staff, Shift } from "@/pages/manager/ScheduleBuilder"

interface AddShiftModalProps {
  locationId: string
  prefilledDate?: string
  prefilledStaffId?: string | null
  staffList?: Staff[]
  allShifts?: Shift[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function AddShiftModal({
  locationId,
  prefilledDate,
  prefilledStaffId,
  staffList = [],
  allShifts = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  trigger
}: AddShiftModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled && controlledOnOpenChange ? controlledOnOpenChange : setInternalOpen

  const [startDate, setStartDate] = React.useState(prefilledDate ? new Date(prefilledDate) : new Date())
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("17:00")
  const [requiredSkill, setRequiredSkill] = React.useState("")
  const [headcount, setHeadcount] = React.useState(1)
  const [overrideReason, setOverrideReason] = React.useState("")

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setStartDate(prefilledDate ? new Date(prefilledDate) : new Date())
      setStartTime("09:00")
      setEndTime("17:00")
      setRequiredSkill("")
      setHeadcount(1)
      setOverrideReason("")
    }
  }, [open, prefilledDate])

  const { mutateAsync: createShift, isPending: isCreating } = useCreateShift()
  const { mutateAsync: assignShift, isPending: isAssigning } = useAssignShift()

  const startAt = new Date(startDate)
  const [startHour, startMin] = startTime.split(":").map(Number)
  startAt.setHours(startHour, startMin, 0, 0)

  const endAt = new Date(startDate)
  const [endHour, endMin] = endTime.split(":").map(Number)
  endAt.setHours(endHour, endMin, 0, 0)

  const shiftHours = Math.max(0, (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60))
  const dayId = format(startAt, "yyyy-MM-dd")

  // Calculate What-If Metrics
  const staff = prefilledStaffId ? staffList.find(s => s.id === prefilledStaffId) : null;
  const staffOtherShifts = staff ? allShifts.filter(s => s.staffId === staff.id) : [];

  const currentWeeklyHours = staffOtherShifts.reduce((sum, s) => sum + s.hours, 0);
  const projectedWeeklyHours = staff ? currentWeeklyHours + shiftHours : 0;
  const maxHours = staff?.maxHours || 40;

  const staffShiftsThisDay = staff ? staffOtherShifts.filter(s => s.dayId === dayId) : [];
  const currentDailyHours = staffShiftsThisDay.reduce((sum, s) => sum + s.hours, 0);
  const projectedDailyHours = staff ? currentDailyHours + shiftHours : 0;

  const uniqueDays = new Set(staffOtherShifts.map(s => s.dayId));
  if (staff) uniqueDays.add(dayId);
  const consecutiveDays = uniqueDays.size;

  const isDailyOver12 = projectedDailyHours > 12;
  const isWeeklyOver40 = projectedWeeklyHours > maxHours;
  const isWeeklyWarning = projectedWeeklyHours >= 35 && !isWeeklyOver40;
  const isDailyWarning = projectedDailyHours > 8 && !isDailyOver12;
  const is7thDay = consecutiveDays >= 7;
  const is6thDay = consecutiveDays === 6;

  const needsOverride = is7thDay;
  const isBlocked = isDailyOver12 || (needsOverride && !overrideReason.trim()) || (endAt <= startAt);

  const isPending = isCreating || isAssigning

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBlocked) return;

    if (endAt <= startAt) {
      alert("End time must be after start time")
      return
    }

    try {
      const shiftData = await createShift({
        locationId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        requiredSkill,
        headcount,
      })

      // If a staff member was prefilled (e.g. clicked on their row), assign them immediately
      if (prefilledStaffId && shiftData?.id) {
        await assignShift({
          shiftId: shiftData.id,
          staffProfileId: prefilledStaffId,
          date: startAt.toISOString(),
          overrideReason: needsOverride ? overrideReason : undefined
        })
      }

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error(error)
    }
  }

  const skills = ["bartender", "line_cook", "server", "host", "dishwasher", "manager"]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-106.25">
        <div className="space-y-4">
          <DialogTitle>Create New Shift</DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={format(startDate, "yyyy-MM-dd")}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredSkill">Required Skill</Label>
              <Select value={requiredSkill} onValueChange={setRequiredSkill} required>
                <SelectTrigger id="requiredSkill">
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills.map(skill => (
                    <SelectItem key={skill} value={skill}>
                      {skill.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!prefilledStaffId && (
              <div className="space-y-2">
                <Label htmlFor="headcount">Headcount</Label>
                <Input
                  id="headcount"
                  type="number"
                  min="1"
                  max="10"
                  value={headcount}
                  onChange={(e) => setHeadcount(Number(e.target.value))}
                />
              </div>
            )}

            {staff && (
              <div className="space-y-3 mt-4 border rounded-md p-4 bg-muted/10">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm">What-If Analysis</h4>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">{staff.name}</span>
                </div>

                {/* Weekly Hours */}
                <div className={`flex justify-between items-center text-sm ${isWeeklyOver40 ? 'text-destructive font-medium' : isWeeklyWarning ? 'text-yellow-600 font-medium' : ''}`}>
                  <span>Projected Weekly Hours:</span>
                  <span>{projectedWeeklyHours}h / {maxHours}h</span>
                </div>
                {isWeeklyOver40 && (
                  <p className="text-xs text-destructive flex items-center mt-1"><AlertCircleIcon className="h-3 w-3 mr-1" /> Overtime limit exceeded.</p>
                )}
                {isWeeklyWarning && (
                  <p className="text-xs text-yellow-600 flex items-center mt-1"><AlertTriangleIcon className="h-3 w-3 mr-1" /> Approaching overtime limit.</p>
                )}

                {/* Daily Hours */}
                <div className={`flex justify-between items-center text-sm mt-2 ${isDailyOver12 ? 'text-destructive font-medium' : isDailyWarning ? 'text-yellow-600 font-medium' : ''}`}>
                  <span>Projected Daily Hours:</span>
                  <span>{projectedDailyHours}h</span>
                </div>
                {isDailyOver12 && (
                  <p className="text-xs text-destructive flex items-center mt-1"><AlertCircleIcon className="h-3 w-3 mr-1" /> Labor Law Block: Exceeds 12 hours.</p>
                )}
                {isDailyWarning && (
                  <p className="text-xs text-yellow-600 flex items-center mt-1"><AlertTriangleIcon className="h-3 w-3 mr-1" /> Daily hours exceed 8 hours.</p>
                )}

                {/* Consecutive Days */}
                <div className={`flex justify-between items-center text-sm mt-2 ${is7thDay ? 'text-destructive font-medium' : is6thDay ? 'text-yellow-600 font-medium' : ''}`}>
                  <span>Consecutive Days Worked:</span>
                  <span>{consecutiveDays} days</span>
                </div>
                {is7thDay && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-destructive flex items-center"><AlertCircleIcon className="h-3 w-3 mr-1" /> 7th consecutive day requires manager override.</p>
                    <Label htmlFor="overrideReason" className="text-xs font-semibold">Override Reason (Required)</Label>
                    <Textarea
                      id="overrideReason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Enter justification for scheduling 7 consecutive days..."
                      className="text-sm min-h-15"
                      required
                    />
                  </div>
                )}
                {is6thDay && (
                  <p className="text-xs text-yellow-600 flex items-center mt-1"><AlertTriangleIcon className="h-3 w-3 mr-1" /> 6th consecutive day warning.</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isBlocked}>
                {isPending ? "Creating..." : "Create Shift"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}