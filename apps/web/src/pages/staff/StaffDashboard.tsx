import { useState } from "react"
import { SectionCards } from "@/components/section-cards"
import { useDashboardStats } from "@/hooks/useDashboard"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LoaderIcon, CalendarIcon } from "lucide-react"
import { DateTime } from 'luxon'

export function StaffDashboard() {
  const { data, isLoading } = useDashboardStats();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const shifts = data?.upcomingShifts || [];
  const totalPages = Math.ceil(shifts.length / itemsPerPage);
  const currentShifts = shifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>
        <p className="text-muted-foreground">View your schedule, manage availability, and request swaps.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <LoaderIcon className="animate-spin size-8 text-primary" />
        </div>
      ) : (
        <>
          <SectionCards 
            metrics={[
              { title: 'Hours This Week', value: `${data?.hoursThisWeek || 0}h`, footer: 'Total scheduled hours' },
              { title: 'Pending Swaps', value: data?.pendingSwaps || 0, footer: 'Your active swap/drop requests' },
              { title: 'Upcoming Shifts', value: data?.upcomingShifts?.length || 0, footer: 'Scheduled shifts in the future' },
            ]} 
          />
          
          <div className="px-4 lg:px-6 mt-4">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6 border-b">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  <CalendarIcon className="size-5" /> Upcoming Shifts
                </h3>
              </div>
              <div className="p-0">
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
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No upcoming shifts scheduled.</TableCell>
                      </TableRow>
                    ) : (
                      currentShifts.map((assignment: any) => (
                        <TableRow key={assignment.id}>
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
          </div>
        </>
      )}
    </div>
  )
}
