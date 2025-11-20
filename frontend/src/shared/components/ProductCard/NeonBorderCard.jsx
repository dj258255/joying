import React from 'react';
import PropTypes from 'prop-types';

/**
 * 네온 보더 스타일 제품 카드
 * - 녹색 네온 테두리
 * - 호버 시 글로우 효과
 * - 평점 및 리뷰 수 표시
 */
const NeonBorderCard = ({ product }) => {
  return (
    <div
      className="group relative bg-gray-900/80 rounded-xl p-4 border-2 border-green-500/30 hover:border-green-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer overflow-hidden"
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
      </div>

      {/* 제품명 */}
      <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 relative z-10">
        {product.name}
      </h3>

      {/* 가격 & 평점 */}
      <div className="flex items-center justify-between relative z-10">
        <p className="text-green-400 font-semibold text-xs">
          {product.price}
        </p>
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          <span>⭐</span>
          <span className="font-semibold">{product.rating}</span>
          <span className="text-gray-400">({product.reviews})</span>
        </div>
      </div>

      {/* 애니메이션 코너 라인 */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

NeonBorderCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    rating: PropTypes.number.isRequired,
    reviews: PropTypes.number.isRequired,
  }).isRequired,
};

export default NeonBorderCard;

