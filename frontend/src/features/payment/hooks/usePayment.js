/**
 * usePayment Hook
 * 결제 관련 로직을 관리하는 훅
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../api/paymentApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const usePayment = () => {
  const queryClient = useQueryClient();

  // 결제 생성
  const createPaymentMutation = useMutation({
    mutationFn: paymentApi.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PAYMENTS]);
    }
  });

  // 결제 취소
  const cancelPaymentMutation = useMutation({
    mutationFn: ({ paymentId, cancelData }) => 
      paymentApi.cancelPayment(paymentId, cancelData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PAYMENTS]);
    }
  });

  // 결제 환불
  const refundPaymentMutation = useMutation({
    mutationFn: ({ paymentId, refundData }) => 
      paymentApi.refundPayment(paymentId, refundData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PAYMENTS]);
    }
  });

  return {
    createPayment: createPaymentMutation.mutateAsync,
    cancelPayment: cancelPaymentMutation.mutateAsync,
    refundPayment: refundPaymentMutation.mutateAsync,
    isCreating: createPaymentMutation.isPending,
    isCancelling: cancelPaymentMutation.isPending,
    isRefunding: refundPaymentMutation.isPending
  };
};

export const usePaymentStatus = (paymentId) => {
  const {
    data: paymentStatus,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.PAYMENTS, 'status', paymentId],
    queryFn: () => paymentApi.getPaymentStatus(paymentId),
    enabled: !!paymentId,
    refetchInterval: 5000 // 5초마다 상태 확인
  });

  return {
    paymentStatus,
    isLoading,
    error
  };
};
