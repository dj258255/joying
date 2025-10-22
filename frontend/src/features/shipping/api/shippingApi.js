/**
 * Shipping API
 * 배송 추적 관련 API 함수들
 */

import { axiosInstance } from '@/lib/axios';

/**
 * 배송 추적 관련 API
 */
export const shippingApi = {
  /**
   * 송장번호 등록
   * @param {Object} data - 송장 정보
   * @param {string} data.transactionId - 거래 ID
   * @param {string} data.courier - 택배사
   * @param {string} data.trackingNumber - 송장번호
   * @param {string} data.type - 'outbound' | 'return'
   * @returns {Promise<Object>}
   */
  submitTrackingNumber: async (data) => {
    const { data: response } = await axiosInstance.post('/shipping/tracking', data);
    return response;
  },

  /**
   * 배송 상태 조회
   * @param {string} trackingNumber - 송장번호
   * @param {string} courier - 택배사
   * @returns {Promise<Object>}
   */
  getTrackingStatus: async (trackingNumber, courier) => {
    // 실제 구현에서는 외부 배송 추적 API 호출
    // 현재는 모의 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          trackingNumber,
          courier,
          status: 'IN_TRANSIT',
          currentLocation: '서울 분류센터',
          estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          history: [
            {
              status: 'PENDING',
              location: '발송지',
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              description: '집화 대기'
            },
            {
              status: 'COLLECTED',
              location: '발송지',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              description: '집화 완료'
            },
            {
              status: 'IN_TRANSIT',
              location: '서울 분류센터',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              description: '배송 중'
            }
          ]
        });
      }, 1000);
    });
  },

  /**
   * 거래별 배송 정보 조회
   * @param {string} transactionId - 거래 ID
   * @returns {Promise<Object>}
   */
  getTransactionShipping: async (transactionId) => {
    const { data } = await axiosInstance.get(`/shipping/transaction/${transactionId}`);
    return data;
  },

  /**
   * 배송 완료 확인
   * @param {string} transactionId - 거래 ID
   * @param {string} type - 'outbound' | 'return'
   * @returns {Promise<Object>}
   */
  confirmDelivery: async (transactionId, type) => {
    const { data } = await axiosInstance.post(`/shipping/confirm`, {
      transactionId,
      type
    });
    return data;
  }
};
