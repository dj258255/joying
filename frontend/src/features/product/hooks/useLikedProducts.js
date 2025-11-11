/**
 * useLikedProducts Hook
 * 찜한 상품 목록 조회 훅
 */

import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

/**
 * 찜한 상품 목록 조회 훅
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.page - 페이지 번호
 * @param {number} params.size - 페이지 크기
 * @returns {Object} Query 결과
 */
export const useLikedProducts = (params = {}) => {
  console.log('[useLikedProducts] 훅 호출:', params);
  return useQuery({
    queryKey: [QUERY_KEYS.MYPAGE, QUERY_KEYS.LIKED_PRODUCTS, params],
    queryFn: async () => {
      console.log('[useLikedProducts] API 호출 시작:', params);
      const result = await productApi.getLikedProducts(params);
      console.log('[useLikedProducts] API 호출 완료:', result);
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10,   // 10분
    retry: 1,
    onError: (error) => {
      console.error('[useLikedProducts] Query 에러:', error);
    }
  });
};

