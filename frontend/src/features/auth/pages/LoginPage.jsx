/**
 * LoginPage Component
 * 로그인 페이지 컴포넌트
 */

import React from 'react';
import KakaoLoginButton from '../components/KakaoLoginButton';

const LoginPage = () => {
  const handleLoginSuccess = () => {
    // TODO: 메인 페이지로 리다이렉트
    console.log('로그인 성공');
  };

  const handleLoginError = (error) => {
    // TODO: 에러 처리 로직
    console.error('로그인 실패:', error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            물품 대여 플랫폼에 오신 것을 환영합니다
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <KakaoLoginButton
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
