/**
 * HomePage Component
 * Three.js 메인 페이지
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeroScene from '../components/HeroScene';
import { ROUTE_PATHS } from '@/shared/constants';

const HomePage = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    navigate(`${ROUTE_PATHS.SEARCH_RESULTS}?category=${category}`);
  };

  return (
    <div className="min-h-screen">
      {/* Section 1: Three.js 히어로 섹션 */}
      <section className="h-screen">
        <HeroScene onCategoryClick={handleCategoryClick} />
      </section>

      {/* Section 2: 검색 바 + 카테고리 선택 */}
      <section className="min-h-[60vh] bg-white flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            어떤 물건을 빌리고 싶으세요?
          </h2>
          
          {/* TODO: SearchBar 컴포넌트 연동 */}
          <div className="mb-12">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="카메라, 캠핑용품, 전자기기 등..."
                className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-full focus:border-primary-500 focus:outline-none"
              />
              <button className="absolute right-2 top-2 bg-primary-500 text-white px-8 py-2 rounded-full hover:bg-primary-600 transition-colors">
                검색
              </button>
            </div>
          </div>

          {/* 주요 카테고리 버튼 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['카메라', '캠핑용품', '전자기기', '스포츠용품', '생활용품', '도구', '의류', '기타'].map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="p-4 bg-gray-100 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <span className="text-lg font-medium text-gray-700">{category}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: 인기 검색어 / 추천 카테고리 */}
      <section className="min-h-[80vh] bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            인기 대여 상품
          </h2>
          
          {/* TODO: 인기 상품 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">인기 상품 {item}</h3>
                <p className="text-gray-600 mb-4">상품 설명...</p>
                <div className="flex justify-between items-center">
                  <span className="text-primary-600 font-bold">10,000원/일</span>
                  <span className="text-sm text-gray-500">⭐ 4.8 (24)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: 서비스 소개 */}
      <section className="min-h-screen bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            안전하고 신뢰할 수 있는 거래
          </h2>
          <p className="text-xl text-gray-600 mb-16">
            11단계 거래 프로세스와 보증금 에스크로로 안전한 대여 서비스를 제공합니다
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold mb-4">보증금 에스크로</h3>
              <p className="text-gray-600">
                플랫폼이 보증금을 안전하게 보관하여 분쟁 시 공정한 중재를 제공합니다
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📹</span>
              </div>
              <h3 className="text-xl font-bold mb-4">개봉 영상 필수</h3>
              <p className="text-gray-600">
                수령 시와 반납 시 개봉 영상을 촬영하여 물건 상태를 명확히 기록합니다
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-bold mb-4">신뢰도 시스템</h3>
              <p className="text-gray-600">
                거래 횟수와 평점을 기반으로 한 뱃지 시스템으로 신뢰할 수 있는 거래를 보장합니다
              </p>
            </div>
          </div>

          <div className="mt-16">
            <button
              onClick={() => navigate(ROUTE_PATHS.LOGIN)}
              className="bg-primary-500 text-white px-12 py-4 rounded-full text-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              지금 시작하기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
