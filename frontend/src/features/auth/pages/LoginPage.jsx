/**
 * LoginPage Component
 * 로그인 페이지 컴포넌트
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { kakaoLogin } from '../api/authApi';
import { ROUTE_PATHS } from '@/shared/constants';
import kakaoLoginBtn from '@/features/home/assets/kakao_login.png';
import logo from '@/assets/icons/logo.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 리다이렉트된 경로 확인
  const from = location.state?.from || '/';

  const handleKakaoLogin = () => {
    kakaoLogin();
  };

  const handleGoHome = () => {
    navigate(ROUTE_PATHS.HOME);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <div className="max-w-md w-full">
        {/* 로고 섹션 */}
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="빌려joying" 
            className="h-16 w-auto object-contain mx-auto mb-6 cursor-pointer"
            onClick={handleGoHome}
          />
        </div>

        {/* 메인 카드 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* 헤더 섹션 */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">
              로그인
            </h2>
            <p className="text-sm text-gray-300">
              물품 대여 플랫폼에 오신 것을 환영합니다
            </p>
          </div>
          
          {/* 안내 문구 */}
          <div className="bg-primary-500/20 border border-primary-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-100">
                  로그인 후 사용하세요
                </p>
                <p className="text-xs text-primary-200/80 mt-1">
                  상품 대여, 채팅, 결제 등 다양한 서비스를 이용하실 수 있습니다
                </p>
              </div>
            </div>
          </div>

          {from !== '/' && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-200 text-center">
                로그인 후 <span className="font-semibold text-blue-100">{from}</span> 페이지로 이동합니다
              </p>
            </div>
          )}
          
          {/* 버튼 섹션 */}
          <div className="space-y-3 pt-2">
            {/* 카카오 로그인 버튼 */}
            <button
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 rounded-lg overflow-hidden shadow-lg"
              aria-label="카카오로 로그인하기"
            >
              <img
                src={kakaoLoginBtn}
                alt="카카오로 로그인하기"
                className="w-full h-auto object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </button>

            {/* 홈으로 가기 버튼 */}
            <button
              onClick={handleGoHome}
              className="w-full bg-white text-gray-900 border-2 border-white/30 hover:bg-gray-50 hover:border-white/50 font-semibold py-3 px-4 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 shadow-lg"
              aria-label="홈으로 가기"
            >
              둘러보기
            </button>
          </div>
        </div>

        {/* 하단 안내 */}
        <p className="text-center text-gray-400 text-xs mt-6">
          로그인 없이도 서비스를 둘러볼 수 있습니다
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
