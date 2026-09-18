import { useState, useEffect } from 'react';
import { useGlobalShifts } from '@/hooks/useShifts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClockIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { DateTime } from 'luxon';

export function OnDutyDashboard({ locations }: { locations: { id: string, name: string }[] }) {
  const { data: globalShifts, isLoading } = useGlobalShifts();
  const [now, setNow] = useState(DateTime.now());

  // Update "now" every minute to accurately reflect who is on duty
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(DateTime.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">On Duty Now</CardTitle>
        </CardHeader>
        <CardContent className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const shifts = globalShifts || [];
  const locationIds = locations.map(l => l.id);

  // Filter shifts that are currently active and belong to manager's locations
  const activeAssignments = shifts.flatMap((shift: any) => {
    if (!locationIds.includes(shift.locationId)) return [];
    if (shift.status !== 'PUBLISHED') return [];

    const startAt = DateTime.fromISO(shift.startAt);
    const endAt = DateTime.fromISO(shift.endAt);

    if (now >= startAt && now <= endAt) {
      return shift.assignments.map((a: any) => ({
        ...a,
        shift,
        locationName: locations.find(l => l.id === shift.locationId)?.name || 'Unknown',
      }));
    }
    return [];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            On Duty Now
          </span>
          <Badge variant="secondary">{activeAssignments.length} Staff</Badge>
        </CardTitle>
        <CardDescription>Staff currently scheduled for a shift</CardDescription>
      </CardHeader>
      <CardContent>
        {activeAssignments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/10">
            <p className="text-sm">No staff members are currently on duty.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-75 overflow-y-auto pr-2">
            {activeAssignments.map((assignment: any) => {
              const staff = assignment.staff;
              const shift = assignment.shift;
              const initials = `${staff.user.firstName[0]}${staff.user.lastName[0]}`;
              const endAt = DateTime.fromISO(shift.endAt);
              const timeRemaining = endAt.diff(now, ['hours', 'minutes']);

              return (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">
                        {staff.user.firstName} {staff.user.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3" />
                          {assignment.locationName}
                        </span>
                        <span className="text-muted-foreground/30">•</span>
                        <span>{shift.requiredSkill.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1.5">
                      <ClockIcon className="w-3 h-3" />
                      {Math.floor(timeRemaining.hours)}h {Math.round(timeRemaining.minutes)}m left
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
