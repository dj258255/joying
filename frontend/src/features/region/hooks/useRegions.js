/**
 * useRegion Hook
 * 지역(시도 → 구군 → 동) 관련 React Query 훅
 */

import { useQuery } from '@tanstack/react-query';
import { getSidos, getGungus, getDongs } from '@/features/region/api/regionApi';

/**
 * Region Query Key 상수
 */
export const REGION_QUERY_KEYS = {
  ALL: ['regions'],
  SIDO_LIST: ['regions', 'sidos'],
  GUNGU_LIST: (sidoId) => ['regions', 'gungus', sidoId],
  DONG_LIST: (gunguId) => ['regions', 'dongs', gunguId],
};

/**
 * 시도 목록 조회 훅
 * @param {Object} options - React Query 옵션
 * @returns {Object} Query 결과
 */
export const useSidos = (options = {}) => {
  return useQuery({
    queryKey: REGION_QUERY_KEYS.SIDO_LIST,
    queryFn: getSidos,
    staleTime: 1000 * 60 * 60, // 1시간 (자주 변하지 않음)
    gcTime: 1000 * 60 * 120,   // 2시간
    retry: 2,
    ...options,
  });
};

/**
 * 시도 ID로 구군 목록 조회 훅
 * @param {number} sidoId - 시도 ID
 * @param {Object} options - React Query 옵션
 * @returns {Object} Query 결과
 */
export const useGungus = (sidoId, options = {}) => {
  return useQuery({
    queryKey: REGION_QUERY_KEYS.GUNGU_LIST(sidoId),
    queryFn: () => getGungus(sidoId),
    enabled: !!sidoId, // sidoId 있을 때만 실행
    staleTime: 1000 * 60 * 30, // 30분
    gcTime: 1000 * 60 * 60,
    retry: 2,
    ...options,
  });
};

/**
 * 구군 ID로 동 목록 조회 훅
 * @param {number} gunguId - 구군 ID
 * @param {Object} options - React Query 옵션
 * @returns {Object} Query 결과
 */
export const useDongs = (gunguId, options = {}) => {
  return useQuery({
    queryKey: REGION_QUERY_KEYS.DONG_LIST(gunguId),
    queryFn: () => getDongs(gunguId),
    enabled: !!gunguId, // gunguId 있을 때만 실행
    staleTime: 1000 * 60 * 30, // 30분
    gcTime: 1000 * 60 * 60,
    retry: 2,
    ...options,
  });
};