import { useState } from "react"
import { UsersIcon, PlusIcon, SearchIcon, FilterIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useUsers, useLocations, useSkills, useCreateSkill, useCreateUser } from "@/hooks/useAdminData"
import { toast } from "sonner"

export function UserManagement() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: rawUsers = [], isLoading } = useUsers();
  const { data: locations = [] } = useLocations();
  const { data: skills = [] } = useSkills();
  const { mutateAsync: createSkill } = useCreateSkill();
  const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  // New Skill State
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);

  const mappedUsers = rawUsers.map((u: any) => {
    let loc = "None";
    if (u.role === "ADMIN") {
      loc = "All Locations";
    } else if (u.role === "STAFF" && u.staffProfile?.certifications?.length > 0) {
      loc = u.staffProfile.certifications[0].location.name;
    } else if (u.role === "MANAGER" && u.managedLocations?.length > 0) {
      loc = u.managedLocations[0].location.name;
    }

    const s = u.staffProfile?.skills?.map((s: any) => s.skill) || [];
    if (u.role === "MANAGER") s.push("manager");
    if (u.role === "ADMIN") s.push("admin");

    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      skills: s,
      location: loc
    }
  });
  
  const totalPages = Math.ceil(mappedUsers.length / itemsPerPage);
  const currentUsers = mappedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    setIsCreatingSkill(true);
    try {
      const created = await createSkill(newSkillName);
      setSelectedSkills(prev => [...prev, created.name]);
      setNewSkillName("");
      setIsAddingSkill(false);
    } catch (error) {
      toast.error("Failed to create skill");
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const handleSaveUser = async () => {
    if (!name || !email || !role || !location) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    try {
      await createUser({ name, email, role, location, skills: selectedSkills });
      toast.success("User created successfully!");
      setIsSheetOpen(false);
      // Reset form
      setName("");
      setEmail("");
      setRole("");
      setLocation("");
      setSelectedSkills([]);
    } catch (error) {
      toast.error("Failed to create user.");
    }
  };

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
          <SheetContent className="sm:max-w-106.25 overflow-y-auto px-6">
            <SheetHeader>
              <SheetTitle>Add New User</SheetTitle>
              <SheetDescription>
                Create a new user account and assign their role, location, and skills.
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" placeholder="e.g. Jane Doe" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="e.g. jane@coastaleats.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole}>
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
                <Label htmlFor="location">Primary Location *</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc: any) => (
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                    ))}
                    <SelectItem value="All Locations">All Locations (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Skills & Certifications</Label>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsAddingSkill(!isAddingSkill)}>
                    <PlusIcon className="h-3 w-3 mr-1" /> New Skill
                  </Button>
                </div>
                
                {isAddingSkill && (
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      placeholder="Enter skill name..." 
                      className="h-8 text-sm" 
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                    />
                    <Button size="sm" className="h-8" onClick={handleAddSkill} disabled={isCreatingSkill || !newSkillName.trim()}>
                      {isCreatingSkill ? <LoaderIcon className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-2 border rounded-md p-3 bg-muted/50 max-h-40 overflow-y-auto">
                  {skills.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No skills available. Create one above.</span>
                  ) : (
                    skills.map((skill: any) => (
                      <div key={skill.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`skill-${skill.id}`} 
                          checked={selectedSkills.includes(skill.name)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedSkills(prev => [...prev, skill.name]);
                            else setSelectedSkills(prev => prev.filter(s => s !== skill.name));
                          }}
                        />
                        <label htmlFor={`skill-${skill.id}`} className="text-sm font-medium leading-none capitalize">
                          {skill.name.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              <Button onClick={handleSaveUser} disabled={isCreatingUser}>
                {isCreatingUser && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
                Save User
              </Button>
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
                    {user.skills.map((s: string) => <Badge key={s} variant="outline" className="capitalize">{s.replace(/_/g, ' ')}</Badge>)}
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
