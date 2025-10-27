import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 1: Hero
 * - 메인 히어로 섹션
 * - 검색창으로 제품 검색
 * - 3D 카메라 모델 표시 (Section 1 스케일)
 */
const Section1Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 검색어와 함께 ProductListPage로 이동
      navigate(`${ROUTE_PATHS.PRODUCTS}?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      // 검색어 없으면 전체 상품 목록으로 이동
      navigate(ROUTE_PATHS.PRODUCTS);
    }
  };

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
          부담없이 시작하는 취미생활!
        </p>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="무엇이든 빌려보세요!"
              className="w-full px-8 py-5 pr-32 rounded-full text-lg bg-white/10 backdrop-blur-xl border-2 border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white/15 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-primary-600 transition-all hover:scale-105"
            >
              검색
            </button>
          </div>

          {/* 인기 검색어 */}
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm text-gray-400">인기 검색어:</span>
            {['카메라', '캠핑', '게임기', '노트북'].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => {
                  setSearchQuery(keyword);
                  navigate(`${ROUTE_PATHS.PRODUCTS}?q=${encodeURIComponent(keyword)}`);
                }}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-primary-500 hover:text-primary-400 transition-all"
              >
                {keyword}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
};

export default Section1Hero;

