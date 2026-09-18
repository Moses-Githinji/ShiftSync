"use client"

import { LoaderIcon, UsersIcon } from "lucide-react"
import { useAllStaff } from "@/hooks/useDashboard"
import { StaffTable } from "@/components/staff-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StaffDirectory() {
  const { data: allStaff, isLoading } = useAllStaff();

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="h-8 w-8" />
          Staff Directory
        </h1>
        <p className="text-muted-foreground">View all staff members and their details.</p>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>All Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderIcon className="animate-spin size-8 text-primary" />
              </div>
            ) : (
              <StaffTable data={allStaff || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}