import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import { kakaoLogin } from '@/features/auth/api/authApi';

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
            <button
              onClick={handleKakaoLogin}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black px-12 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11L5.526 21.83c-.5.5-1.3.5-1.8 0s-.5-1.3 0-1.8l4.746-4.746A13.5 13.5 0 0 1 1.5 11.185C1.5 6.664 6.201 3 12 3z"/>
              </svg>
              카카오로 로그인하기
            </button>
            <button
              onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
              className="bg-white text-black px-12 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105"
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


