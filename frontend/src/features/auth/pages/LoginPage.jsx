/**
 * LoginPage Component
 * 로그인 페이지 컴포넌트
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { kakaoLogin } from '../api/authApi';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 리다이렉트된 경로 확인
  const from = location.state?.from || '/';

  const handleKakaoLogin = () => {
    kakaoLogin();
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
          {from !== '/' && (
            <p className="mt-1 text-center text-xs text-blue-600">
              로그인 후 <span className="font-semibold">{from}</span> 페이지로 이동합니다
            </p>
          )}
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleKakaoLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11L5.526 21.83c-.5.5-1.3.5-1.8 0s-.5-1.3 0-1.8l4.746-4.746A13.5 13.5 0 0 1 1.5 11.185C1.5 6.664 6.201 3 12 3z"/>
            </svg>
            카카오로 로그인하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
