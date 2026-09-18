"use client"

import * as React from "react"
import { useAssignShift } from "@/hooks/useShifts"
import { useSocket } from "@/providers/SocketProvider"
import { useAuthStore } from "@/store/authStore"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Staff, Shift } from "@/pages/manager/ScheduleBuilder"

interface EditShiftModalProps {
  shift: Shift | null
  staffList: Staff[]
  allShifts: Shift[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditShiftModal({ shift, staffList, allShifts, open, onOpenChange }: EditShiftModalProps) {
  const [targetStaffId, setTargetStaffId] = React.useState<string>("unassigned")
  const { mutateAsync: assignShift, isPending } = useAssignShift()

  const [overrideReason, setOverrideReason] = React.useState("")

  const { socket } = useSocket()
  const user = useAuthStore(state => state.user)

  React.useEffect(() => {
    if (open && shift && socket && user) {
      setTargetStaffId(shift.staffId || "unassigned")
      setOverrideReason("")

      // Notify others that we're editing this shift
      socket.emit('manager_editing', {
        shiftId: shift.id,
        managerName: `${user.firstName} ${user.lastName}`,
        locationId: shift.locationId,
      })
    }
  }, [open, shift, socket, user])

  React.useEffect(() => {
    if (!socket || !open || !shift) return

    const handleConflict = (data: { shiftId: string, managerName: string }) => {
      if (data.shiftId === shift.id) {
        toast.warning(`${data.managerName} is currently editing this shift. Changes may conflict!`)
      }
    }

    socket.on('manager_editing_conflict', handleConflict)
    return () => {
      socket.off('manager_editing_conflict', handleConflict)
    }
  }, [socket, open, shift])

  // Calculate What-If Metrics
  const staff = targetStaffId !== "unassigned" ? staffList.find(s => s.id === targetStaffId) : null;
  const staffOtherShifts = staff ? allShifts.filter(s => s.staffId === staff.id && s.id !== shift?.id) : [];

  const currentWeeklyHours = staffOtherShifts.reduce((sum, s) => sum + s.hours, 0);
  const projectedWeeklyHours = shift ? currentWeeklyHours + shift.hours : 0;
  const maxHours = staff?.maxHours || 40;

  const staffShiftsThisDay = shift ? staffOtherShifts.filter(s => s.dayId === shift.dayId) : [];
  const currentDailyHours = staffShiftsThisDay.reduce((sum, s) => sum + s.hours, 0);
  const projectedDailyHours = shift ? currentDailyHours + shift.hours : 0;

  const uniqueDays = new Set(staffOtherShifts.map(s => s.dayId));
  if (shift) uniqueDays.add(shift.dayId);
  const consecutiveDays = uniqueDays.size;

  const isDailyOver12 = projectedDailyHours > 12;
  const isWeeklyOver40 = projectedWeeklyHours > maxHours;
  const isWeeklyWarning = projectedWeeklyHours >= 35 && !isWeeklyOver40;
  const isDailyWarning = projectedDailyHours > 8 && !isDailyOver12;
  const is7thDay = consecutiveDays >= 7;
  const is6thDay = consecutiveDays === 6;

  const needsOverride = is7thDay;
  const isBlocked = isDailyOver12 || (needsOverride && !overrideReason.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shift || isBlocked) return;

    try {
      const staffProfileId = targetStaffId === "unassigned" ? null : targetStaffId;

      await assignShift({
        shiftId: shift.id,
        staffProfileId,
        overrideReason: needsOverride ? overrideReason : undefined
      })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    }
  }

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <div className="space-y-4">
          <DialogTitle>Edit Shift Assignment</DialogTitle>
          <div className="text-sm text-muted-foreground border p-3 rounded-md bg-muted/20">
            <p><strong>Time:</strong> {shift.time}</p>
            <p><strong>Skill:</strong> {shift.skill}</p>
            <p><strong>Hours:</strong> {shift.hours}h</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetStaffId">Assigned Staff</Label>
              <Select value={targetStaffId} onValueChange={setTargetStaffId} required>
                <SelectTrigger id="targetStaffId">
                  <SelectValue placeholder="Select staff or unassign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-destructive font-medium">
                    Unassigned (Move to pool)
                  </SelectItem>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {staff && shift && (
              <div className="space-y-3 mt-4 border rounded-md p-4 bg-muted/10">
                <h4 className="font-semibold text-sm">What-If Analysis</h4>

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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isBlocked}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
