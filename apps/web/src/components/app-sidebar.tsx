import * as React from "react"
import { useAuthStore } from "@/store/authStore"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  Settings2Icon,
  CalendarClockIcon,
  CalendarCheckIcon,
  RefreshCcwIcon,
  CommandIcon,
  LogOutIcon,
} from "lucide-react"
import { useUnreadNotificationCount } from "@/hooks/useStaffFeatures"

function StaffNavItems() {
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  return [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    {
      title: "My Schedule",
      url: "/dashboard/schedule",
      icon: <CalendarClockIcon />,
      badge: unreadCount > 0 ? String(unreadCount > 9 ? "9+" : unreadCount) : undefined,
    },
    { title: "Availability", url: "/dashboard/availability", icon: <Settings2Icon /> },
    { title: "Swap Board", url: "/dashboard/swaps", icon: <RefreshCcwIcon /> },
  ];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuthStore();
  const isStaff = user?.role === 'STAFF';
  const staffNavItems = isStaff ? StaffNavItems() : [];

  const getNavMain = () => {
    if (!user) return [];
    if (user.role === 'ADMIN') {
      return [
        { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Locations", url: "/dashboard/locations", icon: <FolderIcon /> },
        { title: "Users", url: "/dashboard/users", icon: <UsersIcon /> },
        { title: "Audit Logs", url: "/dashboard/audit", icon: <ListIcon /> },
      ];
    }
    if (user.role === 'MANAGER') {
      return [
        { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Schedule Builder", url: "/dashboard/schedule-builder", icon: <CalendarCheckIcon /> },
        { title: "Staff", url: "/dashboard/staff", icon: <UsersIcon /> },
        { title: "Approvals", url: "/dashboard/approvals", icon: <RefreshCcwIcon /> },
        { title: "Analytics", url: "/dashboard/analytics", icon: <ChartBarIcon /> },
      ];
    }
    // Staff — items are computed with live badge count
    return staffNavItems;
  };

  const navSecondary = [
    {
      title: "Logout",
      url: "#",
      icon: <LogOutIcon className="text-destructive" />,
      onClick: () => {
        logout();
        window.location.href = '/login';
      }
    },
  ];

  const userData = user ? {
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    avatar: "",
  } : { name: "Guest", email: "", avatar: "" };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">ShiftSync</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavMain()} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
