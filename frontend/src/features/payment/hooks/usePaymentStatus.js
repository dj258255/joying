/**
 * usePaymentStatus Hook
 * 결제 상태 확인 관련 로직을 관리하는 훅
 */

import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../api/paymentApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const usePaymentStatus = (paymentId) => {
  const {
    data: paymentStatus,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [QUERY_KEYS.PAYMENTS, 'status', paymentId],
    queryFn: () => paymentApi.getPaymentStatus(paymentId),
    enabled: !!paymentId,
    refetchInterval: 5000, // 5초마다 상태 확인
    staleTime: 0 // 항상 최신 상태 확인
  });

  const getStatusText = (status) => {
    const statusMap = {
      'pending': '결제 대기',
      'processing': '결제 처리중',
      'completed': '결제 완료',
      'failed': '결제 실패',
      'cancelled': '결제 취소',
      'refunded': '환불 완료'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': 'text-yellow-600 bg-yellow-100',
      'processing': 'text-blue-600 bg-blue-100',
      'completed': 'text-green-600 bg-green-100',
      'failed': 'text-red-600 bg-red-100',
      'cancelled': 'text-gray-600 bg-gray-100',
      'refunded': 'text-purple-600 bg-purple-100'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  };

  const isCompleted = paymentStatus?.status === 'completed';
  const isFailed = paymentStatus?.status === 'failed';
  const isPending = paymentStatus?.status === 'pending';
  const isProcessing = paymentStatus?.status === 'processing';

  return {
    paymentStatus,
    isLoading,
    error,
    refetch,
    getStatusText,
    getStatusColor,
    isCompleted,
    isFailed,
    isPending,
    isProcessing
  };
};
