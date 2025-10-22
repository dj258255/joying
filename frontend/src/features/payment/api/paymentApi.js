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
   * 결제 생성
   * @param {Object} data
   * @param {string} data.rentalId - 대여 ID
   * @param {string} data.paymentMethod - 결제 수단
   * @param {number} data.amount - 결제 금액
   * @returns {Promise<Object>}
   */
  createPayment: async (data) => {
    return await axiosInstance.post('/payment', data);
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
