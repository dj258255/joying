import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import logo from '@/assets/icons/logo.png';

/**
 * Section 1: Hero
 * - 메인 히어로 섹션
 * - 검색창으로 제품 검색
 * - 3D 카메라 모델 표시 (Section 1 스케일)
 * - 우측 상단에 로그인/회원가입 또는 프로필 버튼
 */
const Section1Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, user } = useAuth();

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
      {/* 우측 상단 버튼 - 로그인 상태에서만 표시 */}
      {isAuthenticated && (
        <div className="absolute top-8 right-8 flex items-center gap-4">
          <button
            onClick={() => navigate(ROUTE_PATHS.MYPAGE)}
            className="group relative w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ring-2 ring-white/30 hover:ring-white/50"
            title={user?.nickname || '마이페이지'}
          >
            {user?.nickname?.charAt(0) || '👤'}
          </button>
        </div>
      )}

      <div className="container mx-auto px-8">
        {/* 로고 중앙 정렬 */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="mb-6 flex justify-center">
            <img 
              src={logo} 
              alt="빌려joying" 
              className="h-32 lg:h-56 w-auto object-contain"
            />
          </h1>
        </div>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative group">
            {/* 검색 아이콘 */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <svg 
                className="w-5 h-5 text-gray-400 group-focus-within:text-primary-400 transition-colors duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* 입력창 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="무엇이든 빌려보세요! 카메라, 캠핑용품, 게임기..."
              className="w-full pl-14 pr-32 py-4 rounded-full text-base 
                         bg-white/10 backdrop-blur-xl 
                         border-2 border-white/20 
                         text-white placeholder-gray-400
                         focus:outline-none focus:border-primary-500 focus:bg-white/15
                         transition-all duration-300
                         shadow-2xl shadow-black/20"
            />

            {/* 검색 버튼 */}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 
                         bg-gradient-to-r from-primary-500 to-blue-500 
                         hover:from-primary-600 hover:to-blue-600
                         text-white px-7 py-2.5 rounded-full font-semibold text-sm
                         transition-all duration-300 
                         hover:scale-105 hover:shadow-lg hover:shadow-primary-500/50
                         active:scale-95"
            >
              검색
            </button>

            {/* 포커스 시 글로우 효과 */}
            <div className="absolute inset-0 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none -z-10">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/20 via-blue-500/20 to-purple-500/20 blur-2xl" />
            </div>
          </div>

          {/* 인기 검색어 */}
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm text-gray-400 font-medium">🔥 인기 검색어</span>
            {['카메라', '캠핑', '게임기', '노트북'].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => {
                  setSearchQuery(keyword);
                  navigate(`${ROUTE_PATHS.PRODUCTS}?q=${encodeURIComponent(keyword)}`);
                }}
                className="group/keyword relative px-5 py-2.5 rounded-full 
                           bg-white/5 backdrop-blur-sm
                           border border-white/10 
                           text-sm text-gray-300 font-medium
                           hover:bg-white/10 hover:border-primary-500 hover:text-primary-400 
                           transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary-500/20
                           active:scale-95"
              >
                <span className="relative z-10">{keyword}</span>
                {/* 호버 시 배경 그라데이션 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover/keyword:opacity-100 transition-opacity duration-300" />
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
};

export default Section1Hero;
