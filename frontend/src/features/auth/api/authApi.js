/**
 * Auth API functions
 * 카카오 로그인, 로그아웃, 토큰 갱신, 사용자 조회 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const authApi = {
  /**
   * 카카오 로그인
   * @param {string} code - 카카오 인증 코드
   * @returns {Promise} 로그인 응답
   */
  kakaoLogin: (code) => 
    axiosInstance.post('/auth/kakao', { code }),

  /**
   * 로그아웃
   * @returns {Promise} 로그아웃 응답
   */
  logout: () => 
    axiosInstance.post('/auth/logout'),

  /**
   * 토큰 갱신
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Promise} 토큰 갱신 응답
   */
  refreshToken: (refreshToken) => 
    axiosInstance.post('/auth/refresh', { refreshToken }),

  /**
   * 현재 사용자 정보 조회
   * @returns {Promise} 사용자 정보
   */
  getCurrentUser: () => 
    axiosInstance.get('/auth/me'),

  /**
   * 토큰 유효성 검증
   * @returns {Promise} 토큰 유효성 응답
   */
  validateToken: () => 
    axiosInstance.get('/auth/validate')
};
