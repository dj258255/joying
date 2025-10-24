import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 3: 캠핑용품 (텐트)
 * - 캠핑용품 소개
 * - 텐트 3D 모델 표시
 * - 나뭇잎 떨어지는 파티클 효과 (HomePage에서 관리)
 */
const Section3Tent = ({ debugMode = false }) => {
  const navigate = useNavigate();

  return (
    <section
      id="section-3"
      className={`relative min-h-screen flex items-center ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
      style={{ zIndex: 60 }}
    >
      <div className="container mx-auto px-8">
        <div className="max-w-2xl ml-auto">
          <span className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-4 block">
            아웃도어
          </span>
          <h2 className="text-6xl font-bold mb-6">
            자연을<br />만끽하다
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            텐트, 캠핑 의자, 테이블 등 다양한 캠핑용품을 대여하여
            편안하고 즐거운 아웃도어 경험을 만드세요.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?category=camping`)}
              className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105"
            >
              캠핑용품 둘러보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section3Tent;

