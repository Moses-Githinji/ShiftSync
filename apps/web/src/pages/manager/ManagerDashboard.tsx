"use client"

import { useState } from "react"
import { LoaderIcon } from "lucide-react"
import { useDashboardStats, useStaffHoursByDay, useAllStaff } from "@/hooks/useDashboard"
import { SectionCards } from "@/components/section-cards"
import { PieChartComponent } from "@/components/ui/pie-chart"
import { StaffTable } from "@/components/staff-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export function ManagerDashboard() {
  const { data, isLoading } = useDashboardStats();
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  
  const { data: staffHours, isLoading: isLoadingHours } = useStaffHoursByDay(selectedDay);
  const { data: allStaff, isLoading: isLoadingStaff } = useAllStaff();

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground">Manage your locations, schedule staff, and approve swaps.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <LoaderIcon className="animate-spin size-8 text-primary" />
        </div>
      ) : (
        <>
          <SectionCards 
            metrics={[
              { title: 'Pending Approvals', value: data?.pendingApprovals ?? 0, footer: 'Swap and drop requests needing review' },
              { title: 'Active Shifts', value: data?.activeShifts ?? 0, footer: 'Published shifts across your locations' },
              { title: 'Overtime Alerts', value: data?.overtimeAlerts ?? 0, trend: (data?.overtimeAlerts ?? 0) > 0 ? 'down' : 'up', badge: (data?.overtimeAlerts ?? 0) > 0 ? `${data.overtimeAlerts} at risk` : 'All clear', footer: 'Staff near or over overtime limits' },
            ]} 
          />
          
          <div className="px-4 lg:px-6">
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Hours by Staff Member</CardTitle>
                <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(Number(v))}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoadingHours ? (
                  <div className="flex items-center justify-center py-12">
                    <LoaderIcon className="animate-spin size-8 text-primary" />
                  </div>
                ) : (
                  <PieChartComponent 
                    data={staffHours?.map((s: any) => ({
                      name: s.name,
                      value: Math.round(s.totalHours * 10) / 10,
                      skills: s.skills,
                    })) || []} 
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Directory</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? (
                  <div className="flex items-center justify-center py-12">
                    <LoaderIcon className="animate-spin size-8 text-primary" />
                  </div>
                ) : (
                  <StaffTable data={allStaff || []} />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}