import { Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

import { DashboardLayout } from './components/DashboardLayout';
import { ScheduleBuilder } from './pages/manager/ScheduleBuilder';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { useAuthStore } from './store/authStore';
import { StaffDirectory } from './pages/manager/StaffDirectory';
import { ApprovalsQueue } from './pages/manager/ApprovalsQueue';
import { AnalyticsDashboard } from './pages/manager/AnalyticsDashboard';
import { LocationManagement } from './pages/admin/LocationManagement';
import { UserManagement } from './pages/admin/UserManagement';
import { AuditLogs } from './pages/admin/AuditLogs';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { MySchedule } from './pages/staff/MySchedule';
import { AvailabilityPage } from './pages/staff/AvailabilityPage';
import { SwapBoard } from './pages/staff/SwapBoard';

const DashboardIndex = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'MANAGER') return <ManagerDashboard />;
  return <StaffDashboard />;
};

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardIndex />} />
            
            {/* Admin Routes */}
            <Route path="/dashboard/locations" element={<LocationManagement />} />
            <Route path="/dashboard/users" element={<UserManagement />} />
            <Route path="/dashboard/audit" element={<AuditLogs />} />
            
            {/* Manager Routes */}
            <Route path="/dashboard/schedule-builder" element={<ScheduleBuilder />} />
            <Route path="/dashboard/staff" element={<StaffDirectory />} />
            <Route path="/dashboard/approvals" element={<ApprovalsQueue />} />
            <Route path="/dashboard/analytics" element={<AnalyticsDashboard />} />
            
            {/* Staff Routes */}
            <Route path="/dashboard/schedule" element={<MySchedule />} />
            <Route path="/dashboard/availability" element={<AvailabilityPage />} />
            <Route path="/dashboard/swaps" element={<SwapBoard />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  );
}
