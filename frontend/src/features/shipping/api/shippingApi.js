/**
 * Shipping API
 * 배송 추적 관련 API 함수들
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { trackPackage, mapCourierToCarrierId, transformTrackingData } from './deliveryTrackerApi';

/**
 * 배송 추적 관련 API
 */
export const shippingApi = {
  /**
   * 배송 상태 조회 (Delivery Tracker API 사용)
   * @param {string} trackingNumber - 송장번호
   * @param {string} courier - 택배사 코드 (cj, post, lotte 등)
   * @returns {Promise<Object>} 배송 추적 정보
   */
  getTrackingStatus: async (trackingNumber, courier) => {
    if (!trackingNumber || !courier) {
      throw new Error('운송장 번호와 택배사 정보가 필요합니다.');
    }

    try {
      // 프론트엔드 택배사 코드를 Delivery Tracker carrierId로 변환
      const carrierId = mapCourierToCarrierId(courier);

      // Delivery Tracker API 호출
      const trackData = await trackPackage(carrierId, trackingNumber);

      // Delivery Tracker 응답을 프론트엔드 형식으로 변환
      const transformedData = transformTrackingData(trackData);

      return {
        trackingNumber,
        courier,
        ...transformedData,
        rawData: trackData, // 원본 데이터도 포함 (디버깅용)
      };
    } catch (error) {
      console.error('[shippingApi] 배송 추적 조회 실패:', error);
      throw error;
    }
  },
};

