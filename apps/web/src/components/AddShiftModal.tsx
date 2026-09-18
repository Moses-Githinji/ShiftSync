"use client"

import * as React from "react"
import { useCreateShift } from "@/hooks/useShifts"
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
  onSuccess?: () => void
}

export function AddShiftModal({ locationId, onSuccess }: AddShiftModalProps) {
  const [startDate, setStartDate] = React.useState(new Date())
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("17:00")
  const [requiredSkill, setRequiredSkill] = React.useState("")
  const [headcount, setHeadcount] = React.useState(1)
  const [open, setOpen] = React.useState(false)

  const { mutate: createShift, isPending } = useCreateShift()

  const handleSubmit = (e: React.FormEvent) => {
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

    createShift({
      locationId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      requiredSkill,
      headcount,
    }, {
      onSuccess: () => {
        setOpen(false)
        onSuccess?.()
      }
    })
  }

  const skills = ["bartender", "line_cook", "server", "host", "dishwasher", "manager"]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} variant="outline">
          Add Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
              <Select value={requiredSkill} onValueChange={setRequiredSkill}>
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
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Shift"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}