import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import ProfileImage from '@/shared/components/ProfileImage';
import logo from '@/assets/icons/logo.png';
import { searchApi } from '@/features/search/api/searchApi';
import { useCategoryTree } from '@/features/category/hooks/useCategories';

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
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);
  const { isAuthenticated, user } = useAuth();
  const { data: categories = [] } = useCategoryTree();

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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchApi.autocomplete(searchQuery);
        setSuggestions(data);
      } catch (err) {
        console.error('자동완성 요청 실패:', err);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const handleSelectSuggestion = (keyword) => {
    setSearchQuery(keyword);
    setSuggestions([]);
    navigate(`${ROUTE_PATHS.PRODUCTS}?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <section
      id="section-1"
      className="relative min-h-screen flex items-center justify-center"
      style={{ zIndex: 60, scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* 왼쪽 상단 로고 */}
      <div className="absolute top-8 left-8">
        <img 
          src={logo} 
          alt="빌려joying" 
          className="h-12 w-auto object-contain cursor-pointer"
          onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
        />
      </div>

      {/* 우측 상단 버튼 */}
      <div className="absolute top-8 right-8 flex items-center gap-4">
        {isAuthenticated ? (
          <button
            onClick={() => navigate(ROUTE_PATHS.MYPAGE)}
            className="group relative w-9 h-9 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ring-2 ring-white/30 hover:ring-white/50 overflow-hidden"
            title={user?.nickname || '마이페이지'}
          >
            <ProfileImage
              src={user?.profileImageUrl}
              alt={user?.nickname || '프로필'}
              size={36}
              className="w-full h-full"
            />
          </button>
        ) : (
          <button
            onClick={() => navigate(ROUTE_PATHS.LOGIN)}
            className="px-6 py-2.5 rounded-full 
                       bg-white/10 backdrop-blur-xl
                       border-2 border-white/20 
                       text-white font-semibold text-sm
                       hover:bg-white hover:text-black
                       transition-all duration-300 
                       hover:scale-105 hover:shadow-lg
                       active:scale-95"
          >
            로그인
          </button>
        )}
      </div>

      <div className="container mx-auto px-8">
        {/* 로고 중앙 정렬 */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="mb-6 flex justify-center">
            <img 
              src={logo} 
              alt="빌려joying" 
              className="h-32 lg:h-56 w-auto object-contain cursor-pointer"
              onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
            />
          </h1>
        </div>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative group">
            {/* 검색 아이콘 */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <svg 
                className="w-5 h-5 text-gray-400 group-focus-within:text-white transition-colors duration-300" 
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)} // 클릭 시 바로 안 닫히게 살짝 delay
              placeholder="무엇이든 빌려보세요! 카메라, 캠핑용품, 게임기..."
              className="w-full pl-14 pr-32 py-4 rounded-full text-base 
                         bg-white/10 backdrop-blur-xl 
                         border-2 border-white/20 
                         text-white placeholder-gray-400
                         focus:outline-none focus:border-white focus:bg-white/15
                         transition-all duration-300
                         shadow-2xl shadow-black/20"
            />

            {/* 자동완성 드롭다운 */}
          {isFocused && suggestions.length > 0 && (
            <ul
              className="absolute left-0 right-0 mt-2 
                bg-white/95 backdrop-blur-xl 
                rounded-2xl shadow-xl border border-white/20 
                z-50 overflow-hidden animate-fadeIn max-h-60 overflow-y-auto"
            >
              {suggestions.map((item, idx) => (
                <li
                  key={idx}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="flex items-center gap-2 px-5 py-3 
                            text-gray-800 text-sm font-medium 
                            hover:bg-gray-200 cursor-pointer
                            transition-all duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="truncate">{item}</span>
                </li>
              ))}
            </ul>
          )}

            {/* 검색 버튼 */}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 
                         bg-white hover:bg-gray-100
                         text-black px-7 py-2.5 rounded-full font-semibold text-sm
                         transition-all duration-300 
                         hover:scale-105 hover:shadow-lg
                         active:scale-95"
            >
              검색
            </button>

            {/* 포커스 시 글로우 효과 */}
            <div className="absolute inset-0 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none -z-10">
              <div className="absolute inset-0 rounded-full bg-white/20 blur-2xl" />
            </div>
          </div>

          {/* 인기 카테고리 */}
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm text-gray-400 font-medium">🔥 인기 카테고리</span>
            {categories.slice(0, 4).map((mainCategory) => {
              // 각 상위 카테고리의 첫 번째 하위 카테고리 선택
              const subCategory = mainCategory.children?.[0];
              if (!subCategory) return null;

              // 하위 카테고리 아이콘 매핑
              const getCategoryIcon = (subName) => {
                const iconMap = {
                  '카메라': '📷',
                  '3D프린터': '🖨️',
                  '콘솔 게임기': '🎮',
                  '텐트': '⛺'
                };
                
                return iconMap[subName] || '📦';
              };

              return (
                <button
                  key={subCategory.categoryId}
                  type="button"
                  onClick={() => {
                    // 하위 카테고리 ID로 필터링된 ProductListPage로 이동
                    navigate(`${ROUTE_PATHS.PRODUCTS}?category=${subCategory.categoryId}`);
                  }}
                  className="group/keyword relative px-5 py-2.5 rounded-full 
                             bg-white/5 backdrop-blur-sm
                             border border-white/10 
                             text-sm text-gray-300 font-medium
                             hover:bg-white/10 hover:border-white hover:text-white 
                             transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-white/20
                             active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>{getCategoryIcon(subCategory.categoryName)}</span>
                    <span>{subCategory.categoryName}</span>
                  </span>
                  {/* 호버 시 배경 그라데이션 */}
                  <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover/keyword:opacity-100 transition-opacity duration-300" />
                </button>
              );
            })}
          </div>
        </form>
      </div>
    </section>
  );
};

export default Section1Hero;
