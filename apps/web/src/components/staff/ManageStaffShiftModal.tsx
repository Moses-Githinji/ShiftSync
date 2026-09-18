"use client"

import * as React from "react"
import { useRequestSwap, useRequestDrop } from "@/hooks/useStaffFeatures"
import { useStaff } from "@/hooks/useShifts"
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
import { DateTime } from "luxon"

interface ManageStaffShiftModalProps {
  shiftAssignment: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageStaffShiftModal({ shiftAssignment, open, onOpenChange }: ManageStaffShiftModalProps) {
  const [action, setAction] = React.useState<"swap" | "drop" | null>(null)
  const [targetStaffId, setTargetStaffId] = React.useState<string>("")
  
  const locationId = shiftAssignment?.shift?.locationId || null;
  const { data: staffList = [] } = useStaff(locationId);

  const { mutateAsync: requestSwap, isPending: isSwapping } = useRequestSwap()
  const { mutateAsync: requestDrop, isPending: isDropping } = useRequestDrop()

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setAction(null)
      setTargetStaffId("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shiftAssignment) return;

    try {
      if (action === "swap") {
        if (!targetStaffId) return;
        await requestSwap({ shiftId: shiftAssignment.shiftId, toStaffId: targetStaffId })
      } else if (action === "drop") {
        await requestDrop({ shiftId: shiftAssignment.shiftId })
      }
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    }
  }

  if (!shiftAssignment) return null;

  const start = DateTime.fromISO(shiftAssignment.shift.startAt)
  const end = DateTime.fromISO(shiftAssignment.shift.endAt)
  const isPending = isSwapping || isDropping

  // Filter staff to those who have the required skill and are not the current user
  // Assume current user ID is not needed to filter since they don't see themselves in the list if we had their user ID,
  // but we don't have it easily here without auth store. That's fine, they can see themselves but it would error.
  const requiredSkill = shiftAssignment.shift.requiredSkill;
  const eligibleStaff = staffList.filter((s: any) => 
    s.skills.some((sk: any) => sk.skill === requiredSkill)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <div className="space-y-4">
          <DialogTitle>Manage Shift</DialogTitle>
          <div className="text-sm text-muted-foreground border p-3 rounded-md bg-muted/20">
            <p><strong>Date:</strong> {start.toFormat('ccc, MMM d, yyyy')}</p>
            <p><strong>Time:</strong> {start.toFormat('h:mm a')} - {end.toFormat('h:mm a')}</p>
            <p><strong>Role:</strong> {requiredSkill.replace(/_/g, ' ')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What would you like to do?</Label>
              <Select value={action || ""} onValueChange={(val: any) => setAction(val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swap">Swap with a coworker</SelectItem>
                  <SelectItem value="drop">Drop shift (offer to anyone)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action === "swap" && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="targetStaffId">Select Coworker</Label>
                <Select value={targetStaffId} onValueChange={setTargetStaffId} required>
                  <SelectTrigger id="targetStaffId">
                    <SelectValue placeholder="Choose a qualified coworker" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleStaff.length === 0 && (
                      <SelectItem value="none" disabled>No eligible coworkers found</SelectItem>
                    )}
                    {eligibleStaff.map((staff: any) => (
                      <SelectItem key={staff.userId} value={staff.userId}>
                        {staff.user.firstName} {staff.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground pt-1">
                  They will need to accept the swap, and a manager must approve it.
                </p>
              </div>
            )}
            
            {action === "drop" && (
              <p className="text-sm text-muted-foreground pt-2">
                Your shift will be posted to the Swap Board. You remain responsible for it until someone claims it and a manager approves.
              </p>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!action || isPending}>
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
