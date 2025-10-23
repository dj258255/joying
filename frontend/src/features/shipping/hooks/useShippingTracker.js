/**
 * useShippingTracker Hook
 * 배송 추적 관리 훅
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shippingApi } from '../api/shippingApi';

export const useShippingTracker = (trackingNumber, courier) => {
  const [status, setStatus] = useState('PENDING');

  // 실제 배송 추적 API 호출 (현재는 모의 구현)
  const { data: trackingData, isLoading } = useQuery({
    queryKey: ['shipping', trackingNumber, courier],
    queryFn: () => shippingApi.getTrackingStatus(trackingNumber, courier),
    enabled: !!trackingNumber && !!courier,
    refetchInterval: 60000, // 1분마다 폴링
    staleTime: 30000, // 30초
  });

  // 모의 배송 상태 업데이트 (프로토타입용)
  useEffect(() => {
    if (!trackingNumber || !courier) return;

    const simulateShipping = () => {
      const statuses = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < statuses.length - 1) {
          currentIndex++;
          setStatus(statuses[currentIndex]);
        } else {
          clearInterval(interval);
        }
      }, 2 * 60 * 1000); // 2분마다 다음 단계로

      return () => clearInterval(interval);
    };

    // 개발 환경에서만 모의 시뮬레이션 실행
    if (import.meta.env.DEV) {
      const cleanup = simulateShipping();
      return cleanup;
    }
  }, [trackingNumber, courier]);

  // 실제 API 데이터가 있으면 사용
  useEffect(() => {
    if (trackingData?.status) {
      setStatus(trackingData.status);
    }
  }, [trackingData]);

  return {
    status: trackingData?.status || status,
    isLoading,
    trackingData,
    isDelivered: (trackingData?.status || status) === 'DELIVERED',
  };
};

export const useTrackingNumberSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitTrackingNumber = async (data) => {
    setIsSubmitting(true);
    try {
      // TODO: 실제 API 호출
      await shippingApi.submitTrackingNumber(data);
      return { success: true };
    } catch (error) {
      console.error('송장번호 등록 실패:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitTrackingNumber,
    isSubmitting,
  };
};
