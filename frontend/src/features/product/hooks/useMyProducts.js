/**
 * useMyProducts Hook
 * 등록한 상품 목록 조회 훅
 */

import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

/**
 * 등록한 상품 목록 조회 훅
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.page - 페이지 번호
 * @param {number} params.size - 페이지 크기
 * @param {string} params.sort - 정렬 기준
 * @returns {Object} Query 결과
 */
export const useMyProducts = (params = {}) => {
  
  return useQuery({
    queryKey: [QUERY_KEYS.MYPAGE, QUERY_KEYS.REGISTERED_PRODUCTS, params],
    queryFn: async () => {
      
      const result = await productApi.getMyProducts(params);
      
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10,   // 10분
    retry: 1,
    onError: (error) => {
      
    }
  });
};

