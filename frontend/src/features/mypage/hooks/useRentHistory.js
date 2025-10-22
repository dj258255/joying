/**
 * useRentHistory Hook
 * 대여 내역 관련 로직을 관리하는 훅
 */

import { useQuery } from '@tanstack/react-query';
import { mypageApi } from '../api/mypageApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useRentHistory = (params = {}) => {
  const {
    data: rentHistory,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.MYPAGE, 'rent-history', params],
    queryFn: () => mypageApi.getRentHistory(params),
    staleTime: 1000 * 60 * 5 // 5분
  });

  return {
    rentHistory: rentHistory?.data || [],
    isLoading,
    error
  };
};
