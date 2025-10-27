import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

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
                <div
                  key={product.id}
                  className="group relative backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:border-white/40 cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  {/* 이미지 */}
                  <div className="relative overflow-hidden rounded-xl mb-3 aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>

                  {/* 제품명 */}
                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">
                    {product.name}
                  </h3>

                  {/* 가격 & 평점 */}
                  <div className="flex items-center justify-between">
                    <p className="text-primary-400 font-semibold text-xs">
                      {product.price}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <span>⭐</span>
                      <span className="font-semibold">{product.rating}</span>
                      <span className="text-gray-400">({product.reviews})</span>
                    </div>
                  </div>

                  {/* 호버 효과: 빛나는 테두리 */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 via-blue-500/20 to-purple-500/20 blur-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?category=camera`)}
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

