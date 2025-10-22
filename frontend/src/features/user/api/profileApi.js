/**
 * Profile API functions
 * 프로필 이미지 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const profileApi = {
  /**
   * 프로필 이미지 업로드
   * @param {FormData} formData - 이미지 파일 데이터
   * @returns {Promise} 업로드된 이미지 정보
   */
  uploadProfileImage: (formData) => 
    axiosInstance.post('/users/profile/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  /**
   * 프로필 이미지 삭제
   * @returns {Promise} 삭제 응답
   */
  deleteProfileImage: () => 
    axiosInstance.delete('/users/profile/image')
};
