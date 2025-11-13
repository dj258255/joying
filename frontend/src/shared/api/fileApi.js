/**
 * File API functions
 * 파일 업로드 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 파일 업로드 관련 API
 */
export const fileApi = {
  /**
   * 파일 업로드 (이미지, 비디오 등)
   * @param {File|Blob} file - 업로드할 파일
   * @returns {Promise<Object>} { fileId, url }
   */
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }
};
