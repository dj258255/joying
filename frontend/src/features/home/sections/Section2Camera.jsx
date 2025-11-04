import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';
import { GlassmorphismCard } from '@/shared/components/ProductCard';
import logo from '@/assets/icons/logo.png';

/**
 * Section 2: 카메라 렌탈
 * - 전문가용 카메라 소개 섹션
 * - 3D 카메라 모델 표시
 * - 배경색: 검정색 (black)
 * - 카드 스타일: 글래스모피즘 (Glassmorphism)
 */
const Section2Camera = ({ products = [] }) => {
  const navigate = useNavigate();

  return (
    <section
      id="section-2"
      className="relative min-h-screen flex items-center"
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
        <div className="max-w-2xl ml-auto">
          <span className="text-primary-500 text-sm font-semibold uppercase tracking-wider mb-4 block">
            카메라 렌탈
          </span>
          <h2 className="text-6xl font-bold mb-6">
            전문가용<br />카메라
          </h2>

          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            DSLR부터 미러리스까지, 전문가용 카메라를 합리적인 가격에 대여할 수 있습니다.
            완벽한 순간을 담아보세요.
          </p>

          {/* 글래스모피즘 카드 */}
          {products.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {products.map((product) => (
                <GlassmorphismCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`${ROUTE_PATHS.PRODUCTS}?category=camera`)}
              className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105"
            >
              카메라 둘러보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2Camera;

