import { Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from "@/components/ui/tooltip"
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

import { DashboardLayout } from './components/DashboardLayout';
import { ScheduleBuilder } from './pages/manager/ScheduleBuilder';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { StaffDirectory } from './pages/manager/StaffDirectory';
import { ApprovalsQueue } from './pages/manager/ApprovalsQueue';
import { AnalyticsDashboard } from './pages/manager/AnalyticsDashboard';
import { LocationManagement } from './pages/admin/LocationManagement';
import { UserManagement } from './pages/admin/UserManagement';
import { AuditLogs } from './pages/admin/AuditLogs';

// Basic placeholders for unbuilt pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-1 flex-col p-4 md:p-6">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="text-muted-foreground mt-2">This feature page is currently under construction.</p>
  </div>
);

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<ManagerDashboard />} />
            
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
            <Route path="/dashboard/schedule" element={<PlaceholderPage title="My Schedule" />} />
            <Route path="/dashboard/availability" element={<PlaceholderPage title="Availability Settings" />} />
            <Route path="/dashboard/swaps" element={<PlaceholderPage title="Swap Board" />} />
          </Route>
        </Route>

        {/* Redirect root to dashboard (which handles auth redirect automatically) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </TooltipProvider>
  );
}
