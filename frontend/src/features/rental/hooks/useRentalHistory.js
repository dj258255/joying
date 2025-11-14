/**
 * useRentalHistory Hook
 * 대여 내역 관련 React Query 훅
 */

import { useQuery } from '@tanstack/react-query';
import { rentalApi } from '../api/rentalApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

/**
 * 내가 빌린 대여 내역 조회 훅
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.page - 페이지 번호 (0부터 시작)
 * @param {number} params.size - 페이지 크기
 * @returns {Object} Query 결과
 */
export const useBorrowedHistory = (params = {}) => {
  const { page = 0, size = 20 } = params;
  
  return useQuery({
    queryKey: [QUERY_KEYS.RENTAL_BORROWED_HISTORY, page, size],
    queryFn: () => rentalApi.getBorrowedHistory({ page, size }),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10,   // 10분
  });
};

/**
 * 내가 빌려준 대여 내역 조회 훅
 * @param {Object} params - 쿼리 파라미터
 * @param {number} params.page - 페이지 번호 (0부터 시작)
 * @param {number} params.size - 페이지 크기
 * @returns {Object} Query 결과
 */
export const useLentHistory = (params = {}) => {
  const { page = 0, size = 20 } = params;
  
  return useQuery({
    queryKey: [QUERY_KEYS.RENTAL_LENT_HISTORY, page, size],
    queryFn: () => rentalApi.getLentHistory({ page, size }),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10,   // 10분
  });
};

