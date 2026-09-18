import { useState } from "react"
import { MapPinIcon, PlusIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLocations } from "@/hooks/useAdminData"

export function LocationManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const { data: locations = [], isLoading } = useLocations();

  const totalPages = Math.ceil(locations.length / itemsPerPage);
  const currentLocations = locations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
          <p className="text-muted-foreground">Manage all Coastal Eats locations and their operating timezones.</p>
        </div>
        <Button><PlusIcon className="mr-2 h-4 w-4" /> Add Location</Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Staff Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <LoaderIcon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : currentLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No locations found.
                </TableCell>
              </TableRow>
            ) : currentLocations.map((loc: any) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" /> {loc.name}
                </TableCell>
                <TableCell>{loc.address}</TableCell>
                <TableCell>{loc.timezone}</TableCell>
                <TableCell>{loc.staffCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, locations.length)} of {locations.length} entries
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
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
