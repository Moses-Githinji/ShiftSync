import { useState } from "react"
import { SectionCards } from "@/components/section-cards"
import { useDashboardStats } from "@/hooks/useDashboard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LoaderIcon, CalendarIcon } from "lucide-react"
import { DateTime } from 'luxon'
import { ManageStaffShiftModal } from "@/components/staff/ManageStaffShiftModal"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AvailabilityManager } from "@/components/staff/AvailabilityManager"

export function StaffDashboard() {
  const { data, isLoading } = useDashboardStats();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  
  const itemsPerPage = 5;
  
  const shifts = data?.upcomingShifts || [];
  const totalPages = Math.ceil(shifts.length / itemsPerPage);
  
  const currentShifts = shifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-1 flex-col py-4 md:py-6 space-y-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>
        <p className="text-muted-foreground">Manage your schedule and availability.</p>
      </div>

      <div className="px-4 lg:px-6">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="availability">My Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : (
              <>
                <SectionCards
                  metrics={[
                    { title: "Upcoming Shifts", value: shifts.length.toString(), footer: "This week" },
                    { title: "Hours Scheduled", value: data?.hoursScheduled?.toString() || "0", footer: "This week" },
                    { title: "Open Shifts", value: data?.openShifts?.toString() || "0", footer: "Available to claim" },
                  ]}
                />

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Upcoming Shifts</h2>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="w-4 h-4 mr-2" /> Sync to Calendar
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shifts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                              No upcoming shifts
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentShifts.map((assignment: any) => (
                            <TableRow 
                              key={assignment.id} 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedShift(assignment)
                                setManageModalOpen(true)
                              }}
                            >
                              <TableCell className="font-medium">
                                {DateTime.fromISO(assignment.shift.startAt).toFormat('ccc, MMM d')}
                              </TableCell>
                              <TableCell>
                                {DateTime.fromISO(assignment.shift.startAt).toFormat('h:mm a')} - {DateTime.fromISO(assignment.shift.endAt).toFormat('h:mm a')}
                              </TableCell>
                              <TableCell>{assignment.shift.location.name}</TableCell>
                              <TableCell className="capitalize">{assignment.shift.requiredSkill.replace('_', ' ')}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    
                    {shifts.length > 0 && (
                      <div className="flex items-center justify-between px-4 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, shifts.length)} of {shifts.length} entries
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityManager />
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
// trigger IDE refresh
