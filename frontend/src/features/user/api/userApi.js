/**
 * User API functions
 * 사용자 정보 조회, 수정, 탈퇴 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const userApi = {
  /**
   * 사용자 정보 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise} 사용자 정보
   */
  getUser: (userId) => 
    axiosInstance.get(`/users/${userId}`),

  /**
   * 사용자 정보 수정
   * @param {string} userId - 사용자 ID
   * @param {Object} userData - 수정할 사용자 데이터
   * @returns {Promise} 수정된 사용자 정보
   */
  updateUser: (userId, userData) => 
    axiosInstance.put(`/users/${userId}`, userData),

  /**
   * 사용자 탈퇴
   * @param {string} userId - 사용자 ID
   * @returns {Promise} 탈퇴 응답
   */
  deleteUser: (userId) => 
    axiosInstance.delete(`/users/${userId}`)
};
