import React from 'react';
import PropTypes from 'prop-types';

/**
 * 홀로그램 스타일 제품 카드
 * - 그라데이션 배경과 홀로그램 효과
 * - 스캔 라인 애니메이션
 * - 평점 및 리뷰 수 표시
 */
const HolographicCard = ({ product }) => {
  return (
    <div
      className="group relative bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 rounded-2xl p-4 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-500 cursor-pointer overflow-hidden"
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

      {/* 가격 & 평점 */}
      <div className="flex items-center justify-between relative z-10">
        <p className="text-blue-400 font-semibold text-xs">
          {product.price}
        </p>
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          <span>⭐</span>
          <span className="font-semibold">{product.rating}</span>
          <span className="text-gray-400">({product.reviews})</span>
        </div>
      </div>

      {/* 홀로그램 코너 효과 */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400/50 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-12 group-hover:h-12" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400/50 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-12 group-hover:h-12" />
    </div>
  );
};

HolographicCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    rating: PropTypes.number.isRequired,
    reviews: PropTypes.number.isRequired,
  }).isRequired,
};

export default HolographicCard;

