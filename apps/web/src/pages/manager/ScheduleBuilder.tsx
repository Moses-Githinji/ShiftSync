"use client"

import { useState } from "react"
import { CalendarIcon, GripVerticalIcon, AlertCircleIcon, UsersIcon, SendIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useStaff, useShifts, useAssignShift, usePublishSchedule } from "@/hooks/useShifts"
import { DateTime } from 'luxon'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { AddShiftModal } from "@/components/AddShiftModal"

// --- Types ---
export type Staff = { id: string; name: string; maxHours: number; skills: string[] }
export type Shift = { id: string; staffId: string | null; dayId: string; time: string; skill: string; hours: number; startAt: string; endAt: string }

// --- Draggable Shift Card ---
function DraggableShiftCard({ shift }: { shift: Shift }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: shift,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none relative flex flex-col gap-1 rounded-md border bg-card p-2 text-xs shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${isDragging ? 'opacity-50 z-50 shadow-md ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{shift.time}</span>
        <GripVerticalIcon className="h-3 w-3 text-muted-foreground" />
      </div>
      <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 h-4">{shift.skill}</Badge>
    </div>
  )
}

// --- Droppable Cell ---
function DroppableCell({ id, shifts, staff, day }: { id: string; shifts: Shift[]; staff: Staff | null; day: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { staffId: staff?.id || null, dayId: day }
  })

  return (
    <TableCell 
      ref={setNodeRef}
      className={`min-w-30 p-2 align-top border-x transition-colors relative ${isOver ? 'bg-primary/10 ring-2 ring-primary ring-inset z-10' : ''}`}
    >
      <div className="flex flex-col gap-2 min-h-15">
        {shifts.map(shift => (
          <DraggableShiftCard key={shift.id} shift={shift} />
        ))}
      </div>
    </TableCell>
  )
}

// --- Droppable Pool (Unassigned) ---
function DroppablePool({ id, shifts }: { id: string; shifts: Shift[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: { staffId: null, dayId: 'Any' }
  })

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-50 flex flex-col gap-3 rounded-md border-2 border-dashed p-4 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}
    >
      {shifts.length === 0 && !isOver && (
        <div className="text-center text-muted-foreground text-sm py-8">
          No unassigned shifts.
        </div>
      )}
      {shifts.map(shift => (
        <DraggableShiftCard key={shift.id} shift={shift} />
      ))}
    </div>
  )
}

// --- Main Component ---
export function ScheduleBuilder() {
  const [activeShift, setActiveShift] = useState<any | null>(null)
  const [weekStart, setWeekStart] = useState<DateTime>(() => DateTime.now().startOf('week'))
  
  // Hardcoded location ID for demo (matching seed script). In reality, fetch from user context
  const locationId = "cm170k12u0000x269d510m34h";

  const { data: rawStaff = [] } = useStaff(locationId);
  const { data: rawShifts = [] } = useShifts(locationId);
  const { mutate: assignShift } = useAssignShift();
  const { mutate: publishSchedule } = usePublishSchedule();

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

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const unassignedShifts = shifts.filter(s => s.staffId === null)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveShift(active.data.current as Shift)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveShift(null)

    if (!over) return

    const draggedShift = active.data.current as Shift
    const targetData = over.data.current as { staffId: string | null; dayId: string }

    // If dropped in the same place, do nothing
    if (draggedShift.staffId === targetData.staffId && draggedShift.dayId === targetData.dayId) {
      return
    }

    // --- Validation Logic ---
    if (targetData.staffId) {
      const targetStaff = MOCK_STAFF.find(s => s.id === targetData.staffId);
      
      // Calculate new total hours for this staff member
      const existingShiftsForStaff = shifts.filter(s => s.staffId === targetData.staffId && s.id !== draggedShift.id);
      const totalHours = existingShiftsForStaff.reduce((sum, s) => sum + s.hours, 0) + draggedShift.hours;

      // Overtime Rule
      if (targetStaff && totalHours > targetStaff.maxHours) {
        toast.error(`Cannot assign shift. ${targetStaff.name} would exceed max hours (${totalHours}h / ${targetStaff.maxHours}h).`, {
          icon: <AlertCircleIcon className="text-destructive h-5 w-5" />
        });
        return; // Reject drop
      }

      // Double Booking Rule (Simple check: does staff already have a shift on this day?)
      const hasShiftOnDay = existingShiftsForStaff.some(s => s.dayId === targetData.dayId);
      if (hasShiftOnDay) {
         toast.warning(`${targetStaff?.name} already has a shift on ${targetData.dayId}. Double booking allowed but flagged.`, {
          icon: <AlertCircleIcon className="text-amber-500 h-5 w-5" />
        });
        // We allow the drop, but show a warning toast.
      }
    }

    // Trigger the mutation to save to backend
    let newDate: string | undefined = undefined;
    if (targetData.dayId !== 'Any') {
      const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayIndex = DAYS.indexOf(targetData.dayId);
      if (dayIndex !== -1) {
        newDate = weekStart.plus({ days: dayIndex }).toISODate() ?? undefined;
      }
    }
    
    assignShift({ shiftId: draggedShift.id, staffProfileId: targetData.staffId, date: newDate });
    
    toast.success("Shift reassigned successfully.")
  }

  const handleThisWeek = () => {
    setWeekStart(DateTime.now().startOf('week'))
  }

  const handlePublishSchedule = () => {
    publishSchedule(locationId)
  }

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full gap-4 p-4 md:gap-6 md:p-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule Builder</h1>
            <p className="text-muted-foreground">
              Drag and drop shifts to assign them. Rules engine will prevent overtime.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleThisWeek}>
              <CalendarIcon className="mr-2 h-4 w-4" /> This Week
            </Button>
            <AddShiftModal locationId={locationId} />
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
          <Button variant="outline" onClick={handleThisWeek} className="ml-auto">
            <CalendarIcon className="mr-2 h-4 w-4" /> This Week
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start h-full pb-10">
          
          {/* Main Grid */}
          <div className="xl:col-span-4 rounded-md border bg-card overflow-x-auto shadow-sm">
            <Table className="w-full">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-45 border-r">Staff Member</TableHead>
                  {DAYS.map(day => (
                    <TableHead key={day} className="text-center border-r last:border-r-0 min-w-30">{day}</TableHead>
                  ))}
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
                        <div className="flex flex-col">
                          <span>{staff.name}</span>
                          <span className={`text-xs ${isOvertimeRisk ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                            {totalHours}h / {staff.maxHours}h
                          </span>
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
                      {DAYS.map(day => {
                        const cellId = `cell-${staff.id}-${day}`
                        const shiftsInCell = shifts.filter(s => s.staffId === staff.id && s.dayId === day)
                        return (
                          <DroppableCell 
                            key={cellId} 
                            id={cellId} 
                            staff={staff} 
                            day={day} 
                            shifts={shiftsInCell} 
                          />
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
                Drag shifts from the grid back here to unassign them, or drag these onto the schedule.
              </div>
              <DroppablePool id="pool-unassigned" shifts={unassignedShifts} />
            </div>
          </div>

        </div>

      </div>

      {/* Drag Overlay for smooth animation while dragging */}
      <DragOverlay>
        {activeShift ? (
          <div className="w-30 opacity-90 shadow-xl ring-2 ring-primary rounded-md rotate-3 scale-105 transition-transform pointer-events-none">
            <DraggableShiftCard shift={activeShift} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}