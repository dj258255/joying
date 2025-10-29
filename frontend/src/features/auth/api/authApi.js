/**
 * Auth API
 * 인증 관련 API 호출 함수들 (쿠키 기반)
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 카카오 로그인
 * 백엔드 OAuth2 엔드포인트로 리다이렉트
 */
export const kakaoLogin = () => {
  console.log('🔍 API Base URL:', import.meta.env.VITE_API_BASE_URL);
  
  // 백엔드 OAuth2 엔드포인트로 리다이렉트
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/kakao`;
};

/**
 * 현재 사용자 정보 조회
 * @returns {Promise} 사용자 정보
 */
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get('/api/v1/auth/me');
    return response.data;
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    throw error;
  }
};

/**
 * 토큰 갱신
 * @returns {Promise} API 응답
 */
export const refreshToken = async () => {
  try {
    const response = await axiosInstance.post('/api/v1/auth/refresh');
    return response.data;
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    throw error;
  }
};

/**
 * 로그아웃
 * @returns {Promise} API 응답
 */
export const logout = async () => {
  try {
    const response = await axiosInstance.post('/api/v1/auth/logout');
    return response.data;
  } catch (error) {
    console.error('로그아웃 실패:', error);
    throw error;
  }
};
