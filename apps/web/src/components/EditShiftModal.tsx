"use client"

import * as React from "react"
import { toast } from "sonner"
import { useAssignShift } from "@/hooks/useShifts"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

  React.useEffect(() => {
    if (open && shift) {
      setTargetStaffId(shift.staffId || "unassigned")
    }
  }, [open, shift])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shift) return;

    try {
      const staffProfileId = targetStaffId === "unassigned" ? null : targetStaffId;
      
      // Calculate daily hours if assigning to a staff member
      if (staffProfileId) {
        const staffOtherShifts = allShifts.filter(s => 
          s.staffId === staffProfileId && 
          s.dayId === shift.dayId && 
          s.id !== shift.id
        );
        const totalHours = staffOtherShifts.reduce((sum, s) => sum + s.hours, 0) + shift.hours;
        
        const DAILY_MAX_HOURS = 8;
        if (totalHours > DAILY_MAX_HOURS) {
          const staffName = staffList.find(s => s.id === staffProfileId)?.name || "Staff";
          toast.warning(`Warning: Assigning this shift puts ${staffName} at ${totalHours} hours for the day, exceeding the daily maximum of ${DAILY_MAX_HOURS}h.`);
        }
      }

      await assignShift({
        shiftId: shift.id,
        staffProfileId,
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
