import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 1: Hero
 * - 메인 히어로 섹션
 * - 플랫폼 소개 및 시작하기 CTA
 * - 3D 카메라 모델 표시 (Section 1 스케일)
 */
const Section1Hero = () => {
  const navigate = useNavigate();

  return (
    <section
      id="section-1"
      className="relative min-h-screen flex items-center justify-center"
      style={{ zIndex: 60 }}
    >
      <div className="container mx-auto px-8 text-center">
        <h1 className="text-8xl font-bold mb-6 tracking-tight">
          빌려<span className="text-primary-500">joying</span>
        </h1>
        <p className="text-2xl text-gray-300 mb-12 font-light">
          필요한 물건을 빌려주고 빌리는 지역 기반 렌탈 플랫폼
        </p>
        <button
          onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
          className="bg-primary-500 text-white px-12 py-4 rounded-full text-lg font-semibold hover:bg-primary-600 transition-all hover:scale-105"
        >
          시작하기
        </button>
      </div>
    </section>
  );
};

export default Section1Hero;

