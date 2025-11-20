/**
 * KakaoLoginButton Component
 * 카카오 로그인 버튼 컴포넌트
 */

import React from 'react';
import { useKakaoLogin } from '../hooks/useKakaoLogin';

/**
 * @param {Object} props
 * @param {string} props.className - 추가 CSS 클래스
 * @param {Function} props.onSuccess - 로그인 성공 콜백
 * @param {Function} props.onError - 로그인 실패 콜백
 */
const KakaoLoginButton = ({ 
  className = '', 
  onSuccess, 
  onError 
}) => {
  const { login, isLoading } = useKakaoLogin();

  const handleKakaoLogin = async () => {
    try {
      await login();
      onSuccess?.();
    } catch (error) {
      console.error('카카오 로그인 실패:', error);
      onError?.(error);
    }
  };

  return (
    <button
      onClick={handleKakaoLogin}
      disabled={isLoading}
      className={`bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      {isLoading ? '로그인 중...' : '카카오로 로그인'}
    </button>
  );
};

export default KakaoLoginButton;
