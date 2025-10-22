/**
 * User API functions
 * 사용자 정보 조회, 수정, 탈퇴 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 회원 정보 API
 */
export const userApi = {
  /**
   * 회원 정보 조회
   * @returns {Promise<Object>}
   */
  getUser: async () => {
    return await axiosInstance.get('/user');
  },

  /**
   * 회원 정보 수정
   * @param {Object} data - 수정할 정보
   * @param {string} [data.nickname] - 닉네임
   * @param {string} [data.phone] - 전화번호
   * @param {string} [data.accountNumber] - 계좌번호
   * @returns {Promise<Object>}
   */
  updateUser: async (data) => {
    return await axiosInstance.patch('/user', data);
  },

  /**
   * 회원 탈퇴
   * @returns {Promise<void>}
   */
  deleteUser: async () => {
    return await axiosInstance.delete('/user');
  }
};
