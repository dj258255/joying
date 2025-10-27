import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 3: 캠핑용품 (텐트)
 * - 캠핑용품 소개
 * - 텐트 3D 모델 표시
 * - 나뭇잎 떨어지는 파티클 효과 (HomePage에서 관리)
 * - 카드 스타일: 네온 보더 (Neon Border)
 */
const Section3Tent = ({ products = [] }) => {
  const navigate = useNavigate();

  return (
    <section
      id="section-3"
      className="relative min-h-screen flex items-center"
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

          {/* 네온 보더 카드 */}
          {products.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group relative bg-gray-900/80 rounded-xl p-4 border-2 border-green-500/30 hover:border-green-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  {/* 네온 글로우 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* 이미지 */}
                  <div className="relative overflow-hidden rounded-lg mb-3 aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* 상태 뱃지 */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold ${
                      product.available 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {product.available ? '대여 가능' : '대여 중'}
                    </div>
                  </div>

                  {/* 제품명 */}
                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 relative z-10">
                    {product.name}
                  </h3>

                  {/* 가격 & 위치 */}
                  <div className="flex items-center justify-between relative z-10">
                    <p className="text-green-400 font-semibold text-xs">
                      {product.price}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span>📍</span>
                      <span>{product.location}</span>
                    </div>
                  </div>

                  {/* 애니메이션 코너 라인 */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          )}

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


