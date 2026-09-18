import { useState } from "react"
import { UsersIcon, PlusIcon, SearchIcon, FilterIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useUsers, useLocations, useSkills, useCreateSkill, useCreateUser, useUpdateUser } from "@/hooks/useAdminData"
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
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();

  const [editUserId, setEditUserId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  // New Skill State
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);

  const mappedUsers = rawUsers.map((u: any) => {
    let locs = ["None"];
    if (u.role === "ADMIN") {
      locs = ["All Locations"];
    } else if (u.role === "STAFF" && u.staffProfile?.certifications?.length > 0) {
      locs = u.staffProfile.certifications.map((c: any) => c.location.name);
    } else if (u.role === "MANAGER" && u.managedLocations?.length > 0) {
      locs = u.managedLocations.map((m: any) => m.location.name);
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
      location: locs.join(', '),
      rawLocations: locs
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

  const handleAddClick = () => {
    setEditUserId(null);
    setName("");
    setEmail("");
    setRole("");
    setSelectedLocations([]);
    setSelectedSkills([]);
    setIsSheetOpen(true);
  };

  const handleEditClick = (user: any) => {
    setEditUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setSelectedLocations(user.rawLocations.filter((l: string) => l !== 'None' && l !== 'All Locations'));
    setSelectedSkills(user.skills.filter((s: string) => s !== 'admin' && s !== 'manager'));
    setIsSheetOpen(true);
  };

  const handleSaveUser = async () => {
    if (!name || !email || !role || (role !== 'ADMIN' && selectedLocations.length === 0)) {
      toast.error("Please fill in all required fields and select at least one location.");
      return;
    }
    
    // For admins, automatically set locations to ['All Locations']
    const finalLocations = role === 'ADMIN' ? ['All Locations'] : selectedLocations;

    try {
      if (editUserId) {
        await updateUser({ id: editUserId, payload: { name, email, role, locations: finalLocations, skills: selectedSkills } });
        toast.success("User updated successfully!");
      } else {
        await createUser({ name, email, role, locations: finalLocations, skills: selectedSkills });
        toast.success("User created successfully!");
      }
      setIsSheetOpen(false);
      setName("");
      setEmail("");
      setRole("");
      setSelectedLocations([]);
      setSelectedSkills([]);
      setEditUserId(null);
    } catch (error) {
      toast.error(`Failed to ${editUserId ? 'update' : 'create'} user.`);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage managers, staff, and system administrators.</p>
        </div>

        <Button onClick={handleAddClick}><PlusIcon className="mr-2 h-4 w-4" /> Add User</Button>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setEditUserId(null);
          }
        }}>
          <SheetContent className="sm:max-w-106.25 overflow-y-auto px-6">
            <SheetHeader>
              <SheetTitle>{editUserId ? "Edit User" : "Add New User"}</SheetTitle>
              <SheetDescription>
                {editUserId ? "Update user account details and permissions." : "Create a new user account and assign their role, location, and skills."}
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
              {role !== 'ADMIN' && (
                <div className="grid gap-2">
                  <Label>Assigned Locations *</Label>
                  <div className="flex flex-col gap-3 border rounded-md p-3 bg-muted/50 max-h-40 overflow-y-auto">
                    {locations.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No locations available.</span>
                    ) : (
                      locations.map((loc: any) => (
                        <div key={loc.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`loc-${loc.id}`} 
                            checked={selectedLocations.includes(loc.name)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedLocations(prev => [...prev, loc.name]);
                              else setSelectedLocations(prev => prev.filter(l => l !== loc.name));
                            }}
                          />
                          <label htmlFor={`loc-${loc.id}`} className="text-sm font-medium leading-none">
                            {loc.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

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
              <Button onClick={handleSaveUser} disabled={isCreatingUser || isUpdatingUser}>
                {(isCreatingUser || isUpdatingUser) && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
                {editUserId ? "Update User" : "Save User"}
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
                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>Edit</Button>
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
