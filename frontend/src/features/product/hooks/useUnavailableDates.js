/**
 * useUnavailableDates Hook
 * 대여 불가 날짜 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useUnavailableDates = (productId) => {
  const queryClient = useQueryClient();

  // 대여 불가 날짜 조회
  const {
    data: unavailableDates,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, 'unavailable-dates', productId],
    queryFn: () => productApi.getUnavailableDates(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5 // 5분
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
