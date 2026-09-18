import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useSocket } from '../providers/SocketProvider';

// --- Availability ---

export function useAvailability() {
  return useQuery({
    queryKey: ['availability'],
    queryFn: async () => {
      const { data } = await api.get('/availability');
      return data;
    },
  });
}

export function useSetAvailabilityWindows() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (windows: any[]) => {
      const { data } = await api.post('/availability/windows', { windows });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Availability updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update availability');
    }
  });
}

export function useAddAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exception: any) => {
      const { data } = await api.post('/availability/exceptions', exception);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Exception added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add exception');
    }
  });
}

// --- Swaps & Drops ---

export function useIncomingSwaps() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleSwapUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    };

    socket.on('swap_requested', handleSwapUpdate);
    socket.on('swap_updated', handleSwapUpdate);

    return () => {
      socket.off('swap_requested', handleSwapUpdate);
      socket.off('swap_updated', handleSwapUpdate);
    };
  }, [socket, queryClient]);

  return useQuery({
    queryKey: ['swaps', 'incoming'],
    queryFn: async () => {
      const { data } = await api.get('/swaps/incoming');
      return data;
    },
  });
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['swaps', 'my-requests'],
    queryFn: async () => {
      const { data } = await api.get('/swaps/my-requests');
      return data;
    },
  });
}

export function useAvailableDrops() {
  return useQuery({
    queryKey: ['drops', 'available'],
    queryFn: async () => {
      const { data } = await api.get('/drops/available');
      return data;
    },
  });
}

export function useRequestSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, toStaffId }: { shiftId: string; toStaffId: string }) => {
      const { data } = await api.post('/swaps/request', { shiftId, toStaffId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('Swap requested successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to request swap');
    }
  });
}

export function useRequestDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId }: { shiftId: string }) => {
      const { data } = await api.post('/drops/request', { shiftId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('Shift dropped — it will appear on the Swap Board');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to drop shift');
    }
  });
}

export function useRespondToSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      const action = accept ? 'accept' : 'decline';
      const { data } = await api.patch(`/swaps/${requestId}/${action}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['swaps', 'incoming'] });
      toast.success(variables.accept ? 'Swap accepted. Awaiting manager approval.' : 'Swap declined');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to respond to swap');
    }
  });
}

export function useClaimDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await api.post(`/drops/${requestId}/claim`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drops', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift claimed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to claim shift');
    }
  });
}

export function useClaimOpenShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data } = await api.post(`/shifts/${shiftId}/claim`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drops', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('Open shift claimed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to claim shift');
    }
  });
}

// --- Notifications ---

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data as number;
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch(`/notifications/${notificationId}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
