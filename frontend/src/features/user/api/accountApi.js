/**
 * Account API functions
 * 계좌 인증 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 계좌 인증 API
 */
export const accountApi = {
  /**
   * 계좌 인증
   * @param {Object} data
   * @param {string} data.bankCode - 은행 코드
   * @param {string} data.accountNumber - 계좌번호
   * @param {string} data.accountHolder - 예금주명
   * @returns {Promise<{verified: boolean}>}
   */
  verifyAccount: async (data) => {
    return await axiosInstance.post('/accounts/verify', data);
  }
};
