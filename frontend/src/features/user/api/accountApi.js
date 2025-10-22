/**
 * Account API functions
 * 계좌 인증 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const accountApi = {
  /**
   * 계좌 인증 요청
   * @param {Object} accountData - 계좌 정보
   * @returns {Promise} 인증 요청 응답
   */
  verifyAccount: (accountData) => 
    axiosInstance.post('/users/account/verify', accountData),

  /**
   * 계좌 인증 상태 조회
   * @returns {Promise} 인증 상태
   */
  getAccountStatus: () => 
    axiosInstance.get('/users/account/status')
};
