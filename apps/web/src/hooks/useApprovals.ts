import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export type SwapRequest = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  shift: {
    id: string;
    startAt: string;
    endAt: string;
    requiredSkill: string;
    location: { id: string; name: string };
    assignments: { staff: { user: { firstName: string; lastName: string } } }[];
  };
  fromStaff: { id: string; firstName: string; lastName: string };
  toStaff: { id: string; firstName: string; lastName: string } | null;
};

export type DropRequest = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  shift: {
    id: string;
    startAt: string;
    endAt: string;
    requiredSkill: string;
    location: { id: string; name: string };
    assignments: { staff: { user: { firstName: string; lastName: string } } }[];
  };
  staff: { id: string; firstName: string; lastName: string };
};

export type ApprovalsData = {
  swapRequests: SwapRequest[];
  dropRequests: DropRequest[];
};

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get(`/approvals${params}`);
      return data as ApprovalsData;
    },
  });
}

export function useApproveSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/approvals/swaps/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Swap request approved');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to approve swap';
      toast.error(message);
    }
  });
}

export function useDenySwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch(`/approvals/swaps/${id}/deny`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Swap request denied');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to deny swap';
      toast.error(message);
    }
  });
}

export function useApproveDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/approvals/drops/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Drop request approved');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to approve drop';
      toast.error(message);
    }
  });
}

export function useDenyDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch(`/approvals/drops/${id}/deny`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Drop request denied');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to deny drop';
      toast.error(message);
    }
  });
}