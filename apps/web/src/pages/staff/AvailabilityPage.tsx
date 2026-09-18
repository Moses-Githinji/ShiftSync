import { AvailabilityManager } from "@/components/staff/AvailabilityManager"
import { CalendarClockIcon } from "lucide-react"

export function AvailabilityPage() {
  return (
    <div className="flex flex-1 flex-col py-4 md:py-6 space-y-6">
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-3 mb-1">
          <CalendarClockIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">My Availability</h1>
        </div>
        <p className="text-muted-foreground">
          Set your weekly working hours and add time-off exceptions.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <AvailabilityManager />
      </div>
    </div>
  )
}
