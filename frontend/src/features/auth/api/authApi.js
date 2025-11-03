/**
 * Auth API
 * 인증 관련 API 호출 함수들 (쿠키 기반)
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';

/**
 * 카카오 로그인
 * 백엔드 OAuth2 엔드포인트로 리다이렉트 (/api/v1 없이 직접 호출)
 */
export const kakaoLogin = () => {
  // 환경 감지: 개발 환경인지 프로덕션 환경인지 확인
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const backendTarget = import.meta.env.VITE_BACKEND_TARGET;
  
  let oauthUrl;
  if (isDevelopment && backendTarget && (backendTarget.startsWith('http://') || backendTarget.startsWith('https://'))) {
    // 개발 환경: 절대 URL 사용 (Vite 프록시 없이 직접 백엔드 접근)
    oauthUrl = `${backendTarget}/oauth2/authorization/kakao`;
  } else {
    // 프로덕션 환경: 상대 경로 사용 (Nginx가 프록시 처리)
    // 또는 개발 환경에서 VITE_BACKEND_TARGET이 없는 경우 Vite 프록시 사용
    oauthUrl = '/oauth2/authorization/kakao';
  }
  
  console.log('🔍 OAuth2 Redirect URL:', oauthUrl);
  console.log('🔍 Environment:', { isDevelopment, backendTarget, mode: import.meta.env.MODE });
  window.location.href = oauthUrl;
};

/**
 * 현재 사용자 정보 조회
 * @returns {Promise} 사용자 정보
 */
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.AUTH.ME);
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
    const response = await axiosInstance.post(API_ENDPOINTS.AUTH.REFRESH);
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
    const response = await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  } catch (error) {
    console.error('로그아웃 실패:', error);
    throw error;
  }
};
