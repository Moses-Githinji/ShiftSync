import { useAuthStore } from '../store/authStore';
import { AdminDashboard } from './admin/AdminDashboard';
import { ManagerDashboard } from './manager/ManagerDashboard';
import { StaffDashboard } from './staff/StaffDashboard';

export function Dashboard() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'STAFF':
      return <StaffDashboard />;
    default:
      return <div>Unknown role</div>;
  }
}
