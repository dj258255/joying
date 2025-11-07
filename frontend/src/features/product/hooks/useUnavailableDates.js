/**
 * useUnavailableDates Hook
 * 대여 불가 날짜 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useUnavailableDates = (productId) => {
  const queryClient = useQueryClient();

  // 대여 불가 날짜 조회 (404 에러는 조용히 처리)
  const {
    data: unavailableDates,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, 'unavailable-dates', productId],
    queryFn: async () => {
      try {
        return await productApi.getUnavailableDates(productId);
      } catch (err) {
        // 404 에러는 빈 배열로 처리 (API가 구현되지 않았을 수 있음)
        if (err.response?.status === 404) {
          return { data: [] };
        }
        throw err;
      }
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5분
    retry: (failureCount, error) => {
      // 404 에러는 재시도하지 않음
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // 대여 불가 날짜 설정
  const setUnavailableDatesMutation = useMutation({
    mutationFn: (dates) => productApi.setUnavailableDates(productId, { dates }),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS, 'unavailable-dates', productId]);
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS, productId]);
    }
  });

  return {
    unavailableDates: unavailableDates?.data || [],
    isLoading,
    error,
    setUnavailableDates: setUnavailableDatesMutation.mutateAsync,
    isSetting: setUnavailableDatesMutation.isPending
  };
};
