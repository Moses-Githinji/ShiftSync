import { useState } from "react"
import { UsersIcon, PlusIcon, SearchIcon, FilterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useUsers } from "@/hooks/useAdminData"
import { LoaderIcon } from "lucide-react"

export function UserManagement() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: rawUsers = [], isLoading } = useUsers();

  const mappedUsers = rawUsers.map((u: any) => {
    let location = "None";
    if (u.role === "ADMIN") {
      location = "All Locations";
    } else if (u.role === "STAFF" && u.staffProfile?.certifications?.length > 0) {
      location = u.staffProfile.certifications[0].location.name;
    } else if (u.role === "MANAGER" && u.managedLocations?.length > 0) {
      location = u.managedLocations[0].location.name;
    }

    const skills = u.staffProfile?.skills?.map((s: any) => s.skill) || [];
    if (u.role === "MANAGER") skills.push("manager");
    if (u.role === "ADMIN") skills.push("admin");

    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      skills,
      location
    }
  });
  
  const totalPages = Math.ceil(mappedUsers.length / itemsPerPage);
  const currentUsers = mappedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage managers, staff, and system administrators.</p>
        </div>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button><PlusIcon className="mr-2 h-4 w-4" /> Add User</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-106.25 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New User</SheetTitle>
              <SheetDescription>
                Create a new user account and assign their role, location, and skills.
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="e.g. Jane Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="e.g. jane@coastaleats.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Primary Location</Label>
                <Select>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Downtown Branch">Downtown Branch</SelectItem>
                    <SelectItem value="Westside Location">Westside Location</SelectItem>
                    <SelectItem value="Midwest Hub">Midwest Hub</SelectItem>
                    <SelectItem value="Southern Branch">Southern Branch</SelectItem>
                    <SelectItem value="All Locations">All Locations (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 pt-2">
                <Label>Skills & Certifications</Label>
                <div className="flex flex-col gap-3 mt-2 border rounded-md p-3 bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="skill-bartender" />
                    <label htmlFor="skill-bartender" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Bartender</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="skill-server" />
                    <label htmlFor="skill-server" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Server</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="skill-cook" />
                    <label htmlFor="skill-cook" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Line Cook</label>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              <Button onClick={() => setIsSheetOpen(false)}>Save User</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search users by name or email..." className="pl-8" />
        </div>
        <Button variant="outline"><FilterIcon className="mr-2 h-4 w-4" /> Filter Roles</Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Primary Location</TableHead>
              <TableHead>Skills</TableHead>
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
            ) : currentUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : currentUsers.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full"><UsersIcon className="h-4 w-4 text-primary" /></div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'MANAGER' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.location}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.skills.map((s: string) => <Badge key={s} variant="outline" className="capitalize">{s.replace('_', ' ')}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, mappedUsers.length)} of {mappedUsers.length} entries
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
