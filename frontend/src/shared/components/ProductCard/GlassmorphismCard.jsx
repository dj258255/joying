import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * 글래스모피즘 스타일 제품 카드
 * - 투명한 배경과 블러 효과
 * - 평점 및 리뷰 수 표시
 * - 호버 시 빛나는 그라데이션 효과
 */
const GlassmorphismCard = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div
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
  );
};

GlassmorphismCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    rating: PropTypes.number.isRequired,
    reviews: PropTypes.number.isRequired,
  }).isRequired,
};

export default GlassmorphismCard;

