/**
 * useLikedProducts Hook
 * 찜한 상품 관련 로직을 관리하는 훅
 */

import { useQuery } from '@tanstack/react-query';
import { mypageApi } from '../api/mypageApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useLikedProducts = (params = {}) => {
  const {
    data: likedProducts,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.MYPAGE, 'liked-products', params],
    queryFn: () => mypageApi.getLikedProducts(params),
    staleTime: 1000 * 60 * 5 // 5분
  });

  return {
    likedProducts: likedProducts?.data || [],
    isLoading,
    error
  };
};
