import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useStaff(locationId: string | null) {
  return useQuery({
    queryKey: ['staff', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data } = await api.get(`/shifts/staff?locationId=${locationId}`);
      return data;
    },
    enabled: !!locationId,
  });
}

export function useShifts(locationId: string | null, weekStart?: string) {
  return useQuery({
    queryKey: ['shifts', locationId, weekStart],
    queryFn: async () => {
      if (!locationId) return [];
      let url = `/shifts?locationId=${locationId}`;
      if (weekStart) url += `&weekStart=${weekStart}`;
      const { data } = await api.get(url);
      return data;
    },
    enabled: !!locationId,
  });
}

export function useGlobalShifts() {
  return useQuery({
    queryKey: ['shifts', 'global'],
    queryFn: async () => {
      const { data } = await api.get('/shifts/all');
      return data;
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, staffProfileId, date }: { shiftId: string; staffProfileId: string | null; date?: string }) => {
      const { data } = await api.patch(`/shifts/${shiftId}/assign`, { staffProfileId, date });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to assign shift';
      toast.error(message);
    }
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftData: { locationId: string; startAt: string; endAt: string; requiredSkill: string; headcount?: number }) => {
      const { data } = await api.post('/shifts', shiftData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create shift';
      toast.error(message);
    }
  });
}

export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      const { data } = await api.patch('/shifts/publish', { locationId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Schedule published successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to publish schedule';
      toast.error(message);
    }
  });
}
