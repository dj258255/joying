/**
 * Auth API functions
 * 카카오 로그인, 로그아웃, 토큰 갱신, 사용자 조회 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 인증 관련 API
 */
export const authApi = {
  /**
   * 카카오 로그인
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  kakaoLogin: async () => {
    return await axiosInstance.post('/oauth2/authorization/kakao');
  },

  /**
   * 로그아웃
   * @returns {Promise<void>}
   */
  logout: async () => {
    return await axiosInstance.post('/auth/logout');
  },

  /**
   * 액세스 토큰 갱신
   * @returns {Promise<{accessToken: string}>}
   */
  refreshToken: async () => {
    return await axiosInstance.post('/auth/refresh');
  },

  /**
   * 현재 로그인 사용자 조회
   * @returns {Promise<{id: string, email: string, nickname: string, profileImage: string}>}
   */
  getCurrentUser: async () => {
    return await axiosInstance.get('/auth/me');
  },

  /**
   * 토큰 유효성 검증
   * @returns {Promise<{valid: boolean}>}
   */
  validateToken: async () => {
    return await axiosInstance.get('/auth/validate');
  }
};
