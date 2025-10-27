import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants';

/**
 * Section 4: 전자기기 (게임패드)
 * - 최신 전자기기 소개
 * - 게임패드 3D 모델 표시
 * - 카드 스타일: 홀로그램 (Holographic)
 */
const Section4Gamepad = ({ products = [] }) => {
  const navigate = useNavigate();

  return (
    <section
      id="section-4"
      className="relative min-h-screen flex items-center"
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

          {/* 홀로그램 카드 */}
          {products.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group relative bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 rounded-2xl p-4 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-500 cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/products/${product.id}`)}
                  style={{
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)',
                  }}
                >
                  {/* 홀로그램 애니메이션 배경 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-[shimmer_2s_ease-in-out_infinite_reverse]" />
                  </div>

                  {/* 뱃지 */}
                  {product.badge && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                        product.badge === 'HOT' ? 'bg-red-500/80 text-white' :
                        product.badge === 'NEW' ? 'bg-blue-500/80 text-white' :
                        'bg-purple-500/80 text-white'
                      }`}>
                        {product.badge}
                      </div>
                    </div>
                  )}

                  {/* 이미지 */}
                  <div className="relative overflow-hidden rounded-xl mb-3 aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* 홀로그램 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* 스캔 라인 효과 */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_0%,transparent_48%,rgba(59,130,246,0.3)_50%,transparent_52%,transparent_100%)] bg-[length:100%_4px] animate-[scan_3s_linear_infinite]" />
                    </div>
                  </div>

                  {/* 제품명 */}
                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 relative z-10">
                    {product.name}
                  </h3>

                  {/* 가격 & 재고 */}
                  <div className="flex items-center justify-between relative z-10">
                    <p className="text-blue-400 font-semibold text-xs">
                      {product.price}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        product.stock > 3 ? 'bg-green-400' : 
                        product.stock > 0 ? 'bg-yellow-400' : 
                        'bg-red-400'
                      } animate-pulse`} />
                      <span className="text-gray-400">재고 {product.stock}개</span>
                    </div>
                  </div>

                  {/* 홀로그램 코너 효과 */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400/50 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-12 group-hover:h-12" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400/50 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-12 group-hover:h-12" />
                </div>
              ))}
            </div>
          )}

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


