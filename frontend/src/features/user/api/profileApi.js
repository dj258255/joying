/**
 * Profile API functions
 * 프로필 이미지 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 프로필 이미지 API
 */
export const profileApi = {
  /**
   * 프로필 이미지 등록
   * @param {File} file - 이미지 파일
   * @returns {Promise<{imageUrl: string}>}
   */
  uploadProfileImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await axiosInstance.post('/user/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * 프로필 이미지 변경
   * @param {File} file - 이미지 파일
   * @returns {Promise<{imageUrl: string}>}
   */
  updateProfileImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await axiosInstance.patch('/user/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * 프로필 이미지 삭제
   * @returns {Promise<void>}
   */
  deleteProfileImage: async () => {
    return await axiosInstance.delete('/user/profile-image');
  }
};
