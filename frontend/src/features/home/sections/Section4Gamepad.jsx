import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 4: 전자기기 (게임패드)
 * - 최신 전자기기 소개
 * - 게임패드 3D 모델 표시
 */
const Section4Gamepad = ({ debugMode = false }) => {
  const navigate = useNavigate();

  return (
    <section
      id="section-4"
      className={`relative min-h-screen flex items-center ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
      style={{ zIndex: 60 }}
    >
      <div className="container mx-auto px-8">
        <div className="max-w-2xl ml-auto">
          <span className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-4 block">
            테크
          </span>
          <h2 className="text-6xl font-bold mb-6">
            최신<br />전자기기
          </h2>
          

          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            노트북, 태블릿, 빔 프로젝터 등 최신 전자기기를 대여하여
            스마트한 생활과 업무를 경험하세요.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?category=electronics`)}
              className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105"
            >
              전자기기 둘러보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section4Gamepad;

