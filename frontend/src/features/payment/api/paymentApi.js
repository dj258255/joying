/**
 * Payment API functions
 * 결제 생성/조회/취소/환불, 결제 상태 확인 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const paymentApi = {
  /**
   * 결제 생성
   * @param {Object} paymentData - 결제 데이터
   * @returns {Promise} 결제 정보
   */
  createPayment: (paymentData) => 
    axiosInstance.post('/payments', paymentData),

  /**
   * 결제 조회
   * @param {string} paymentId - 결제 ID
   * @returns {Promise} 결제 정보
   */
  getPayment: (paymentId) => 
    axiosInstance.get(`/payments/${paymentId}`),

  /**
   * 결제 취소
   * @param {string} paymentId - 결제 ID
   * @param {Object} cancelData - 취소 데이터
   * @returns {Promise} 취소 응답
   */
  cancelPayment: (paymentId, cancelData) => 
    axiosInstance.post(`/payments/${paymentId}/cancel`, cancelData),

  /**
   * 결제 환불
   * @param {string} paymentId - 결제 ID
   * @param {Object} refundData - 환불 데이터
   * @returns {Promise} 환불 응답
   */
  refundPayment: (paymentId, refundData) => 
    axiosInstance.post(`/payments/${paymentId}/refund`, refundData),

  /**
   * 결제 상태 확인
   * @param {string} paymentId - 결제 ID
   * @returns {Promise} 결제 상태
   */
  getPaymentStatus: (paymentId) => 
    axiosInstance.get(`/payments/${paymentId}/status`)
};
