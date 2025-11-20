/**
 * User API functions
 * 사용자(회원) 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';

/**
 * 사용자(회원) 관련 API
 */
export const userApi = {
  /**
   * 회원 정보 조회
   * @param {number} memberId - 회원 ID
   * @returns {Promise<Object>} 회원 정보
   */
  getUser: async (memberId) => {
    const response = await axiosInstance.get(API_ENDPOINTS.MEMBER.BY_ID(memberId));
    return response.data;
  },

  /**
   * 회원 프로필 수정
   * @param {number} memberId - 회원 ID (토큰의 memberId와 일치해야 함)
   * @param {Object} data - 수정할 데이터
   * @param {string} [data.nickname] - 변경할 닉네임 (null이면 변경 안 함)
   * @returns {Promise<Object>} 수정된 회원 정보
   */
  updateUser: async (memberId, data) => {
    const response = await axiosInstance.put(
      API_ENDPOINTS.MEMBER.BY_ID(memberId),
      data
    );
    return response.data;
  },

  /**
   * 회원 탈퇴
   * @param {number} memberId - 회원 ID
   * @returns {Promise<{status: number, message: string}>} 탈퇴 응답
   */
  deleteUser: async (memberId) => {
    const response = await axiosInstance.delete(API_ENDPOINTS.MEMBER.BY_ID(memberId));
    return response.data;
  },

  /**
   * 프로필 이미지 등록/변경
   * @param {number} memberId - 회원 ID (토큰의 memberId와 일치해야 함)
   * @param {File} file - 업로드할 이미지 파일 (image/png, image/jpeg, image/jpg, image/gif, 최대 10MB)
   * @returns {Promise<Object>} 업데이트된 회원 정보
   */
  updateProfileImage: async (memberId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 이 요청은 기본 JSON 헤더를 덮어쓰고 명시적으로 multipart/form-data를 사용
    const response = await axiosInstance.put(
      API_ENDPOINTS.MEMBER.PROFILE_IMAGE(memberId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  /**
   * 프로필 이미지 삭제
   * @param {number} memberId - 회원 ID (토큰의 memberId와 일치해야 함)
   * @returns {Promise<Object>} 업데이트된 회원 정보 (기본 이미지로 변경됨)
   */
  deleteProfileImage: async (memberId) => {
    const response = await axiosInstance.delete(
      API_ENDPOINTS.MEMBER.PROFILE_IMAGE(memberId)
    );
    return response.data;
  }
};

