/**
 * Payment API functions
 * 결제 생성/조회/취소/환불, 결제 상태 확인 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 결제 관련 API
 */
export const paymentApi = {
  /**
   * 결제 금액 조회 (견적)
   * @param {string} rentalId - 대여 ID
   * @returns {Promise<{amount: number, deposit: number, total: number}>}
   */
  getPaymentQuote: async (rentalId) => {
    return await axiosInstance.get('/payment/quote', {
      params: { rentalId }
    });
  },

  /**
   * 결제 생성 (OrderId 발급)
   * @param {Object} data
   * @param {number} data.rentalHisId - 예약(대여이력) ID
   * @param {number} data.productId - 상품 ID
   * @param {number} data.totalAmount - 결제 총액(요금+보증금 등)
   * @param {string} data.orderName - 주문명(PG 표시용)
   * @returns {Promise<Object>} { paymentId, orderId, totalAmount }
   */
  createPayment: async (data) => {
    const requestBody = {
      rentalHisId: data.rentalHisId,
      productId: data.productId,
      totalAmount: data.totalAmount,
      orderName: data.orderName
    };

    console.log('[paymentApi] 결제 생성 요청:', requestBody);
    
    const response = await axiosInstance.post('/payments', requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[paymentApi] 결제 생성 성공:', response.data);
    return response.data;
  },

  /**
   * 결제 승인 (Renter - 토스 결제 완료 후)
   * @param {Object} data - 결제 승인 데이터 (PG사별로 다를 수 있음)
   * @returns {Promise<Object>}
   */
  confirmPayment: async (data) => {
    console.log('[paymentApi] 결제 승인 요청:', data);
    
    const response = await axiosInstance.post('/payments/confirm', data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[paymentApi] 결제 승인 성공:', response.data);
    return response.data;
  },

  /**
   * 결제 상세 조회
   * @param {string} paymentId - 결제 ID
   * @returns {Promise<Object>}
   */
  getPaymentDetail: async (paymentId) => {
    return await axiosInstance.get(`/payment/${paymentId}`);
  },

  /**
   * 결제 취소
   * @param {Object} data
   * @param {string} data.paymentId - 결제 ID
   * @param {string} [data.reason] - 취소 사유
   * @returns {Promise<Object>}
   */
  cancelPayment: async (data) => {
    return await axiosInstance.patch('/payment', data);
  },

  /**
   * 환불 요청
   * @param {string} paymentId - 결제 ID
   * @param {Object} data
   * @param {number} data.amount - 환불 금액
   * @param {string} data.reason - 환불 사유
   * @returns {Promise<Object>}
   */
  refundPayment: async (paymentId, data) => {
    return await axiosInstance.post(`/payments/${paymentId}/refund`, data);
  },

  /**
   * 결제 웹훅 결과 확인 (프론트에서는 폴링용)
   * @param {string} paymentId - 결제 ID
   * @returns {Promise<{status: string}>}
   */
  checkPaymentStatus: async (paymentId) => {
    return await axiosInstance.get(`/payment/${paymentId}`);
  }
};
