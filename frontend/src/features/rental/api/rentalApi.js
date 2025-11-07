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
    // productId를 숫자로 변환 (Swagger는 integer($int64)를 기대)
    const productIdNum = Number(productId);
    if (isNaN(productIdNum)) {
      throw new Error(`유효하지 않은 상품 ID: ${productId}`);
    }

    // 날짜가 ISO 문자열인지 확인 및 변환
    const startRen = typeof data.startRen === 'string' 
      ? data.startRen 
      : new Date(data.startRen).toISOString();
    const endRen = typeof data.endRen === 'string'
      ? data.endRen
      : new Date(data.endRen).toISOString();

    // rentMethod 검증
    const validRentMethods = ['DELIVERY', 'MEET', 'BOTH'];
    const rentMethod = validRentMethods.includes(data.rentMethod) 
      ? data.rentMethod 
      : 'BOTH';

    const requestBody = {
      startRen,
      endRen,
      rentMethod
    };

    // 요청 본문 검증 로그
    console.log('[rentalApi] 요청 준비:', {
      productId: productIdNum,
      requestBody,
      'requestBody (stringified)': JSON.stringify(requestBody),
      'startRen 타입': typeof startRen,
      'endRen 타입': typeof endRen
    });

    try {
      const response = await axiosInstance.post(
        `/rentals/${productIdNum}/reservations`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('[rentalApi] 응답 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('[rentalApi] 요청 실패:', {
        url: `/rentals/${productIdNum}/reservations`,
        requestBody,
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }
};

