import { SectionCards } from "@/components/section-cards"
import { useDashboardStats } from "@/hooks/useDashboard"
import { LoaderIcon } from "lucide-react"

export function AdminDashboard() {
  const { data, isLoading } = useDashboardStats();

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
    </div>
  )
}
