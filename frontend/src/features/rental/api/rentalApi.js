/**
 * Rental API functions
 * 대여 거래 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 대여 거래 관련 API
 */
export const rentalApi = {
  /**
   * 대여 거래 생성 (예약)
   * @param {number|string} productId - 상품 ID
   * @param {Object} data - 대여 거래 데이터
   * @param {string} data.startRen - 대여 시작 일시 (ISO-8601)
   * @param {string} data.endRen - 대여 종료 일시 (ISO-8601)
   * @param {string} data.rentMethod - 대여 방법 ('DELIVERY' | 'MEET' | 'BOTH')
   * @returns {Promise<Object>} 생성된 대여 거래 정보
   */
  createRentalReservation: async (productId, data) => {
    const response = await axiosInstance.post(
      `/rentals/${productId}/reservations`,
      {
        startRen: data.startRen,
        endRen: data.endRen,
        rentMethod: data.rentMethod
      }
    );
    return response.data;
  }
};

