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
   * @param {Object} data
   * @param {string} data.orderId - 주문 ID
   * @param {string} data.paymentKey - 토스 페이먼츠 결제 키
   * @param {number} data.amount - 결제 금액
   * @returns {Promise<Object>}
   */
  confirmPayment: async (data) => {
    const requestBody = {
      orderId: data.orderId,
      paymentKey: data.paymentKey,
      amount: data.amount
    };

    console.log('[paymentApi] 결제 승인 요청:', requestBody);

    const response = await axiosInstance.post('/payments/confirm', requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[paymentApi] 결제 승인 성공:', response.data);
    return response.data;
  },

  /**
   * 결제 상세 조회
   * @param {string} orderId - 주문 ID
   * @returns {Promise<Object>}
   */
  getPaymentDetail: async (orderId) => {
    const response = await axiosInstance.get(`/payments/${orderId}`);
    return response.data;
  },

  /**
   * 결제 취소
   * @param {string} orderId - 주문 ID
   * @param {Object} data
   * @param {string} data.paymentId - 결제 ID
   * @param {string} [data.reason] - 취소 사유
   * @returns {Promise<Object>}
   */
  cancelPayment: async (orderId, data) => {
    const response = await axiosInstance.patch(`/payments/${orderId}/cancel`, data);
    return response.data;
  },

  /**
   * 결제 금액 조회
   * @param {string} orderId - 주문 ID
   * @returns {Promise<number>}
   */
  getPaymentAmount: async (orderId) => {
    const response = await axiosInstance.get(`/payments/${orderId}/amount`);
    return response.data;
  },

  /**
   * 결제 상태 확인 (폴링용)
   * @param {string} orderId - 주문 ID
   * @returns {Promise<Object>}
   */
  checkPaymentStatus: async (orderId) => {
    const response = await axiosInstance.get(`/payments/${orderId}`);
    return response.data;
  }
};
