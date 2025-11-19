/**
 * useTrackingStatus Hook
 * 배송 추적 조회 훅 (수동 조회만 지원)
 */

import { useQuery } from '@tanstack/react-query';
import { shippingApi } from '../api/shippingApi';

/**
 * 배송 추적 조회 훅
 * @param {string} trackingNumber - 운송장 번호
 * @param {string} courier - 택배사 코드 (cj, post, lotte 등)
 * @returns {Object} 배송 추적 상태 및 조회 함수
 */
export const useTrackingStatus = (trackingNumber, courier) => {
  // 수동 조회만 지원 (enabled: false)
  const { 
    data: trackingData, 
    isLoading, 
    error,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['tracking', trackingNumber, courier],
    queryFn: () => shippingApi.getTrackingStatus(trackingNumber, courier),
    enabled: false, // 자동 조회 안 함 (수동 조회만)
    retry: 1, // 실패 시 1번만 재시도
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  return {
    // 배송 상태
    status: trackingData?.status || 'PENDING',
    trackingData,
    
    // 로딩 상태
    isLoading: isLoading || isFetching,
    
    // 에러 상태
    error,
    
    // 배송 완료 여부
    isDelivered: trackingData?.status === 'DELIVERED',
    
    // 수동 조회 함수
    refetch: async () => {
      if (!trackingNumber || !courier) {
        
        return;
      }
      return refetch();
    },
  };
};

