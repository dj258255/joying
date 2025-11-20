/**
 * Account API functions
 * 계좌 인증 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';

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
    console.log('[accountApi] startVerification 요청 데이터:', data);
    console.log('[accountApi] 엔드포인트:', API_ENDPOINTS.ACCOUNT.VERIFY_START);
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNT.VERIFY_START, data);
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
    return response.data;
  },

  /**
   * 계좌 거래 내역 조회 (1원 인증 코드 확인용)
   * @param {Object} params
   * @param {string} params.accountNo - 계좌번호
   * @param {string} params.transactionUniqueNo - 거래 고유번호
   * @returns {Promise<{transactionSummary: string, authCode: string}>}
   */
  getTransactionHistory: async (params) => {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNT.TRANSACTIONS, {
      params: {
        accountNo: params.accountNo,
        transactionUniqueNo: params.transactionUniqueNo
      }
    });
    return response.data;
  },

  /**
   * 계좌 인증 (기존 호환성 유지)
   * @param {Object} data
   * @param {string} data.bankCode - 은행 코드
   * @param {string} data.accountNumber - 계좌번호
   * @param {string} data.accountHolder - 예금주명
   * @returns {Promise<{verified: boolean}>}
   */
  verifyAccount: async (data) => {
    return await axiosInstance.post('/accounts/verify', data);
  },

  /**
   * 수시 입출금 상품 목록 조회
   * @returns {Promise<Array<{bankCode: string, bankName: string, accountTypeUniqueNo: string, accountTypeName: string, accountDescription: string}>>}
   */
  getAccountProducts: async () => {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNT.PRODUCTS);
    return response.data;
  },

  /**
   * SSAFY 계좌 생성
   * @param {Object} data
   * @param {string} data.accountTypeUniqueNo - 상품 고유번호 (예: "004-1-001")
   * @returns {Promise<{ssafyAccountId: number, accountTypeUniqueNo: string, accountNo: string, bankCode: string, accountHolderName: string, accountState: string}>}
   */
  createSsafyAccount: async (data) => {
    const response = await axiosInstance.post(API_ENDPOINTS.SSAFY_ACCOUNT.CREATE, data);
    return response.data;
  }
};
