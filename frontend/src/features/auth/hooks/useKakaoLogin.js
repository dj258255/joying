/**
 * useKakaoLogin Hook
 * 카카오 로그인 관련 로직을 관리하는 훅
 */

import { kakaoLogin } from '../api/authApi';

export const useKakaoLogin = () => {
  const login = async () => {
    // 백엔드 OAuth2 인증 엔드포인트로 리다이렉트
    kakaoLogin();
  };

  return {
    login,
    isLoading: false,
    error: null
  };
};
