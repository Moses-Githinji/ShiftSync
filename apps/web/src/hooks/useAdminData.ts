import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    }
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get('/locations');
      return data;
    }
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: async () => {
      const { data } = await api.get('/audit');
      return data;
    }
  });
}
