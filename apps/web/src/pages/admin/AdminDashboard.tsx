import { SectionCards } from "@/components/section-cards"
import { useDashboardStats } from "@/hooks/useDashboard"
import { useGlobalShifts } from "@/hooks/useShifts"
import { LoaderIcon, CalendarIcon, MapPinIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DateTime } from "luxon"

export function AdminDashboard() {
  const { data, isLoading } = useDashboardStats();
  const { data: shifts = [], isLoading: shiftsLoading } = useGlobalShifts();

  return (
    <div className="flex flex-1 flex-col py-4 md:py-6">
      <div className="px-4 lg:px-6 mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Global overview across all locations.</p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <LoaderIcon className="animate-spin size-8 text-primary" />
        </div>
      ) : (
        <SectionCards 
          layout="horizontal"
          metrics={[
            { title: 'Total Locations', value: data?.locations || 0, footer: 'Active Coastal Eats locations' },
            { title: 'Total Staff', value: data?.staff || 0, footer: 'Registered employees' },
            { title: 'Active Shifts', value: data?.activeShifts || 0, footer: 'Currently published shifts' },
            { title: 'System Health', value: data?.systemHealth || '100%', trend: 'up', badge: 'Optimal', footer: 'All systems operational' }
          ]} 
        />
      )}

      <div className="px-4 lg:px-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Global Roster
            </CardTitle>
            <CardDescription>Live overview of all scheduled shifts across all locations.</CardDescription>
          </CardHeader>
          <CardContent>
            {shiftsLoading ? (
              <div className="flex justify-center p-6"><LoaderIcon className="animate-spin w-6 h-6 text-primary" /></div>
            ) : shifts.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">No shifts scheduled.</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift: any) => {
                      const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                      const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);
                      const isAssigned = shift.assignments && shift.assignments.length > 0;
                      
                      return (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              {shift.location.name}
                            </div>
                          </TableCell>
                          <TableCell>{start.toFormat('MMM d, yyyy')}</TableCell>
                          <TableCell>{start.toFormat('h:mm a')} - {end.toFormat('h:mm a')} ({start.offsetNameShort})</TableCell>
                          <TableCell>
                            <Badge variant="outline">{shift.requiredSkill.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <span>
                                {shift.assignments[0].staff.user.firstName} {shift.assignments[0].staff.user.lastName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={shift.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                              {shift.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
