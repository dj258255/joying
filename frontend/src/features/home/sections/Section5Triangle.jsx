import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import { kakaoLogin } from '@/features/auth/api/authApi';
import logo from '@/assets/icons/logo.png';
import kakaoLoginBtn from '../assets/kakao_login.png';

/**
 * Section 5: Final CTA (삼각 대형)
 * - 3D 모델들이 삼각형 대형으로 배치되는 섹션
 * - 회원가입 및 둘러보기 CTA 버튼
 */
const Section5Triangle = () => {
  const navigate = useNavigate();

  const handleKakaoLogin = () => {
    kakaoLogin();
  };

  return (
    <section
      id="section-5"
      className="relative min-h-screen flex items-center justify-end"
      style={{ zIndex: 60 }}
    >
      {/* 왼쪽 상단 로고 */}
      <div className="absolute top-8 left-8">
        <img 
          src={logo} 
          alt="빌려joying" 
          className="h-12 w-auto object-contain cursor-pointer"
          onClick={() => navigate(ROUTE_PATHS.HOME)}
        />
      </div>

      <div className="container mx-auto px-8">
        <div className="max-w-2xl ml-auto text-right">
          <h2 className="text-7xl font-bold mb-6">
            지금 바로<br />
            <span className="text-primary-500">시작하세요</span>
          </h2>

          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            안전한 11단계 거래 시스템과 보증금 에스크로로<br />
            믿을 수 있는 렌탈 서비스를 경험하세요
          </p>
          <div className="flex items-center justify-end gap-4">
            <img
              src={kakaoLoginBtn}
              alt="카카오로 로그인하기"
              onClick={handleKakaoLogin}
              className="h-12 w-auto object-contain cursor-pointer transition-all hover:scale-105"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <button
              onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
              className="bg-white text-black px-8 py-3 rounded-lg text-base font-semibold transition-all hover:scale-105"
            >
              둘러보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section5Triangle;


