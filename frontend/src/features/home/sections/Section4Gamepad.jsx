import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import { HolographicCard } from '@/shared/components/ProductCard';
import logo from '@/assets/icons/logo.png';

/**
 * Section 4: 전자기기 (게임패드)
 * - 최신 전자기기 소개
 * - 게임패드 3D 모델 표시
 * - 카드 스타일: 홀로그램 (Holographic)
 */
const Section4Gamepad = ({ products = [], categoryId }) => {
  const navigate = useNavigate();

  return (
    <section
      id="section-4"
      className="relative min-h-screen flex items-center"
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

          {/* 홀로그램 카드 */}
          {products.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`${ROUTE_PATHS.PRODUCTS}/${product.id}`)}
                >
                  <HolographicCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-6 border-2 border-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.3)]">
                <div className="text-center text-white/70">
                  <p className="text-sm">상품이 없습니다</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(categoryId ? `${ROUTE_PATHS.PRODUCTS}?category=${categoryId}` : ROUTE_PATHS.PRODUCTS)}
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

