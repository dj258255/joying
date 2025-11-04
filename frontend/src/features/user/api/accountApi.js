/**
 * Account API functions
 * 계좌 인증 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';

/**
 * 계좌 인증 API
 */
export const accountApi = {
  /**
   * 1원 인증 시작
   * @param {Object} data
   * @param {string} data.accountNo - 계좌번호
   * @returns {Promise<{accountNo: string, transactionUniqueNo: string, message: string}>}
   */
  startVerification: async (data) => {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNT.VERIFY_START, data);
    // 응답 구조: { status, message, data, timestamp } 또는 직접 data
    if (response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  /**
   * 1원 인증 완료
   * @param {Object} data
   * @param {string} data.accountNo - 계좌번호
   * @param {string} data.authCode - 인증 코드 (4자리)
   * @param {string} data.accountHolderName - 예금주명
   * @returns {Promise<{accountNo: string, realName: string, verified: boolean, message: string}>}
   */
  completeVerification: async (data) => {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNT.VERIFY_COMPLETE, data);
    // 응답 구조: { status, message, data, timestamp } 또는 직접 data
    if (response.data?.data) {
      return response.data.data;
    }
    return response.data;
  }
};
