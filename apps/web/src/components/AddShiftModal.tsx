"use client"

import * as React from "react"
import { useCreateShift, useAssignShift } from "@/hooks/useShifts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"

interface AddShiftModalProps {
  locationId: string
  prefilledDate?: string
  prefilledStaffId?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function AddShiftModal({
  locationId,
  prefilledDate,
  prefilledStaffId,
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

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setStartDate(prefilledDate ? new Date(prefilledDate) : new Date())
      setStartTime("09:00")
      setEndTime("17:00")
      setRequiredSkill("")
      setHeadcount(1)
    }
  }, [open, prefilledDate])

  const { mutateAsync: createShift, isPending: isCreating } = useCreateShift()
  const { mutateAsync: assignShift, isPending: isAssigning } = useAssignShift()

  const isPending = isCreating || isAssigning

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const startAt = new Date(startDate)
    const [startHour, startMin] = startTime.split(":").map(Number)
    startAt.setHours(startHour, startMin, 0, 0)

    const endAt = new Date(startDate)
    const [endHour, endMin] = endTime.split(":").map(Number)
    endAt.setHours(endHour, endMin, 0, 0)

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
          date: startAt.toISOString()
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Shift"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}