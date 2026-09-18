import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data;
    },
  });
}

export function useStaffHoursByDay(dayOfWeek: number) {
  return useQuery({
    queryKey: ['staffHoursByDay', dayOfWeek],
    queryFn: async () => {
      const response = await api.get(`/dashboard/staff-hours?dayOfWeek=${dayOfWeek}`);
      return response.data;
    },
    enabled: dayOfWeek >= 0 && dayOfWeek <= 6,
  });
}

export function useAllStaff() {
  return useQuery({
    queryKey: ['allStaff'],
    queryFn: async () => {
      const response = await api.get('/dashboard/staff');
      return response.data;
    },
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/analytics');
      return response.data;
    },
  });
}
